"""Module B: Event → Numeric (Δ) Event Study 계산
MacKinlay(1997) Market Model 기반 Event Study

4구간 시간 분할:
  [-250, -11] 추정창: α, β 산출 (Market Model)
  [-10, -1]   사전 이벤트창: 정보 유출 감지
  [0]         이벤트일
  [+1, +10]   사후 이벤트창: 영향 지속 측정
"""

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
from scipy import stats
from statsmodels.api import OLS, add_constant

router = APIRouter()


class EventStudyRequest(BaseModel):
    price_series: list[float]              # 종목 일별 종가
    market_series: list[float] | None = None  # 벤치마크 일별 종가 (없으면 Constant Mean)
    event_date_index: int                  # 이벤트일 인덱스
    estimation_window: int = 240           # 추정창 길이 (거래일)
    pre_event_window: int = 10             # 사전 이벤트창
    post_event_window: int = 10            # 사후 이벤트창
    gap: int = 10                          # 추정창과 이벤트창 사이 갭


@router.post("/event-study")
async def compute_event_study(req: EventStudyRequest):
    prices = np.array(req.price_series, dtype=float)
    evt_idx = req.event_date_index

    if len(prices) < 50:
        return {"error": "가격 데이터 부족 (최소 50개)", "car": None, "confidence": "low"}

    # --- 수익률 계산 ---
    returns = np.diff(prices) / prices[:-1]
    n = len(returns)

    if evt_idx <= 0 or evt_idx >= n:
        return {"error": f"이벤트 인덱스 범위 초과 (0 < idx < {n})", "car": None, "confidence": "low"}

    # --- 구간 인덱스 계산 ---
    est_end = evt_idx - req.gap              # 추정창 끝 (이벤트 gap일 전)
    est_start = max(0, est_end - req.estimation_window)

    pre_evt_start = max(0, evt_idx - req.pre_event_window)
    pre_evt_end = evt_idx                    # 이벤트일 직전까지

    post_evt_start = evt_idx                 # 이벤트일 포함
    post_evt_end = min(n, evt_idx + req.post_event_window + 1)

    # 전체 이벤트창: 사전 + 이벤트일 + 사후
    full_evt_start = pre_evt_start
    full_evt_end = post_evt_end

    if est_end - est_start < 30:
        return {"error": "추정창 데이터 부족 (최소 30일)", "car": None, "confidence": "low"}

    # --- 추정창 수익률 ---
    est_returns = returns[est_start:est_end]

    # --- Market Model vs Constant Mean ---
    use_market_model = False
    model_alpha = 0.0
    model_beta = 0.0
    model_r_squared = 0.0

    if req.market_series and len(req.market_series) == len(prices):
        market_prices = np.array(req.market_series, dtype=float)
        market_returns = np.diff(market_prices) / market_prices[:-1]
        est_market = market_returns[est_start:est_end]

        if len(est_market) == len(est_returns) and len(est_returns) > 10:
            # Market Model: R_i = α + β·R_m + ε
            X = add_constant(est_market)
            model = OLS(est_returns, X).fit()
            model_alpha = float(model.params[0])
            model_beta = float(model.params[1])
            model_r_squared = float(model.rsquared)
            use_market_model = True

    if use_market_model:
        # 기대수익률: E[R_t] = α + β·R_m,t
        event_market = market_returns[full_evt_start:full_evt_end]
        expected_returns = model_alpha + model_beta * event_market
        event_returns = returns[full_evt_start:full_evt_end]
        ar = event_returns - expected_returns

        # 추정창 잔차 표준편차
        est_expected = model_alpha + model_beta * est_market
        est_residuals = est_returns - est_expected
        sigma_ar = float(np.std(est_residuals, ddof=2))
    else:
        # Constant Mean Return Model (fallback)
        mean_return = float(np.mean(est_returns))
        sigma_ar = float(np.std(est_returns, ddof=1))
        event_returns = returns[full_evt_start:full_evt_end]
        ar = event_returns - mean_return

    # --- CAR 계산 ---
    car = float(np.sum(ar))

    # --- 사전 이벤트창 CAR (정보유출 감지) ---
    pre_event_ar = ar[:req.pre_event_window] if len(ar) > req.pre_event_window else ar
    pre_event_car = float(np.sum(pre_event_ar))
    leakage_threshold = 2 * sigma_ar * np.sqrt(len(pre_event_ar))
    leakage_detected = abs(pre_event_car) > leakage_threshold

    # --- 사후 이벤트창 CAR ---
    post_start_in_ar = req.pre_event_window + 1 if len(ar) > req.pre_event_window + 1 else 0
    post_event_ar = ar[post_start_in_ar:]
    post_event_car = float(np.sum(post_event_ar))

    # --- t-검정 ---
    n_event = len(ar)
    if sigma_ar > 0 and n_event > 0:
        t_stat = car / (sigma_ar * np.sqrt(n_event))
        df = len(est_returns) - (3 if use_market_model else 1)
        p_value = float(2 * stats.t.sf(abs(t_stat), df=max(df, 1)))
    else:
        t_stat = 0.0
        p_value = 1.0

    # --- 신뢰도 ---
    if p_value < 0.05 and not leakage_detected:
        confidence = "high"
    elif p_value < 0.10:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "car": round(car * 100, 3),              # CAR (%)
        "car_raw": car,
        "t_stat": round(float(t_stat), 4),
        "p_value": round(p_value, 6),
        "confidence": confidence,
        # 구간별 CAR
        "pre_event_car": round(pre_event_car * 100, 3),
        "post_event_car": round(post_event_car * 100, 3),
        "leakage_detected": leakage_detected,
        # Market Model 파라미터
        "model": "market_model" if use_market_model else "constant_mean",
        "model_alpha": round(model_alpha, 6),
        "model_beta": round(model_beta, 4),
        "model_r_squared": round(model_r_squared, 4),
        # 일별 AR
        "daily_ar": [round(float(x) * 100, 3) for x in ar],
        # 메타
        "n_estimation": len(est_returns),
        "n_event_window": n_event,
        "event_window": [int(full_evt_start), int(full_evt_end)],
    }
