"""Module A: Numeric → Numeric (β, r, p-value) 통계 계산"""

from fastapi import APIRouter
from pydantic import BaseModel

from services.stats_service import (
    check_stationarity,
    transform_series,
    find_optimal_lag,
    run_regression,
    run_granger,
)

router = APIRouter()


class NumericToNumericRequest(BaseModel):
    x_series: list[float]
    y_series: list[float]
    frequency: str = "monthly"
    max_lag: int = 24


class LagResult(BaseModel):
    lag: int
    r: float
    p_value: float
    aic: float
    n_obs: int = 0


class NumericToNumericResponse(BaseModel):
    beta: float
    r: float
    p_value: float
    optimal_lag: int
    granger_p: float | None
    transform: str
    n_obs: int
    confidence: str
    all_lags: list[LagResult]


class StationarityRequest(BaseModel):
    series: list[float]


@router.post("/numeric-to-numeric")
async def compute_numeric_to_numeric(req: NumericToNumericRequest):
    # 1. 정상성 검정
    x_stat = check_stationarity(req.x_series)
    y_stat = check_stationarity(req.y_series)

    # 2. 변환 결정 (둘 다 비정상이면 차분)
    transform = "level"
    if not x_stat["is_stationary"] or not y_stat["is_stationary"]:
        transform = x_stat["recommended_transform"]

    x_data = transform_series(req.x_series, transform) if transform != "level" else req.x_series
    y_data = transform_series(req.y_series, transform) if transform != "level" else req.y_series

    # 3. 최적 시차 탐색
    lag_result = find_optimal_lag(x_data, y_data, req.max_lag)
    optimal_lag = lag_result["best_lag_aic"]

    # 4. 회귀분석
    reg = run_regression(x_data, y_data, lag=optimal_lag)

    # 5. Granger 검정
    granger = run_granger(x_data, y_data, max_lag=min(12, req.max_lag))
    granger_p = granger["granger_p"] if granger else None

    # 6. 신뢰도 판정
    n_obs = reg["n_obs"]
    p_val = reg["p_value"]
    if p_val < 0.01 and n_obs >= 120 and granger_p is not None and granger_p < 0.05:
        confidence = "high"
    elif p_val < 0.05 and n_obs >= 60:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "beta": reg["beta"],
        "r": reg["r"],
        "p_value": reg["p_value"],
        "optimal_lag": optimal_lag,
        "granger_p": granger_p,
        "transform": transform,
        "n_obs": n_obs,
        "confidence": confidence,
        "all_lags": lag_result["all_lags"],
        "stationarity": {"x": x_stat, "y": y_stat},
    }


@router.post("/stationarity")
async def compute_stationarity(req: StationarityRequest):
    return check_stationarity(req.series)
