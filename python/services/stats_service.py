"""통계 계산 공통 서비스"""

import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.tsa.stattools import adfuller, kpss, grangercausalitytests
from statsmodels.api import OLS, add_constant


def check_stationarity(series: list[float]) -> dict:
    """ADF + KPSS 정상성 검정 (병행)"""
    arr = np.array(series, dtype=float)
    arr = arr[~np.isnan(arr)]

    # ADF test
    adf_stat, adf_p, *_ = adfuller(arr, autolag="AIC")

    # KPSS test
    kpss_stat, kpss_p, *_ = kpss(arr, regression="c", nlags="auto")

    # 판단 매트릭스
    adf_stationary = adf_p < 0.05
    kpss_stationary = kpss_p > 0.05

    if adf_stationary and kpss_stationary:
        conclusion = "stationary"
        recommended = "level"
    elif not adf_stationary and not kpss_stationary:
        conclusion = "non_stationary"
        recommended = "first_diff"
    else:
        conclusion = "ambiguous"
        recommended = "first_diff"  # 보수적

    return {
        "adf_p": float(adf_p),
        "kpss_p": float(kpss_p),
        "is_stationary": conclusion == "stationary",
        "conclusion": conclusion,
        "recommended_transform": recommended,
    }


def transform_series(series: list[float], method: str) -> list[float]:
    """시계열 변환"""
    arr = np.array(series, dtype=float)
    if method == "first_diff":
        return list(np.diff(arr))
    elif method == "log_return":
        arr = arr[arr > 0]
        return list(np.diff(np.log(arr)))
    return list(arr)


def find_optimal_lag(
    x: list[float], y: list[float], max_lag: int = 24
) -> dict:
    """최적 시차 탐색 (|r| 최대 + AIC 최소)"""
    x_arr = np.array(x, dtype=float)
    y_arr = np.array(y, dtype=float)
    n = min(len(x_arr), len(y_arr))

    candidates = [l for l in [0, 1, 2, 3, 6, 9, 12, 18, 24] if l <= max_lag and l < n - 10]
    results = []

    for lag in candidates:
        if lag == 0:
            x_lagged = x_arr[:n]
            y_aligned = y_arr[:n]
        else:
            x_lagged = x_arr[: n - lag]
            y_aligned = y_arr[lag:n]

        min_len = min(len(x_lagged), len(y_aligned))
        x_lagged = x_lagged[:min_len]
        y_aligned = y_aligned[:min_len]

        if len(x_lagged) < 10:
            continue

        r_val, p_val = stats.pearsonr(x_lagged, y_aligned)

        # AIC from OLS
        X = add_constant(x_lagged)
        try:
            model = OLS(y_aligned, X).fit()
            aic = model.aic
        except Exception:
            aic = float("inf")

        results.append({
            "lag": lag,
            "r": float(r_val),
            "p_value": float(p_val),
            "aic": float(aic),
            "n_obs": int(min_len),
        })

    if not results:
        return {"all_lags": [], "best_lag_aic": 0, "best_lag_r": 0}

    best_aic = min(results, key=lambda x: x["aic"])
    best_r = max(results, key=lambda x: abs(x["r"]))

    return {
        "all_lags": results,
        "best_lag_aic": best_aic["lag"],
        "best_lag_r": best_r["lag"],
    }


def run_regression(
    x: list[float], y: list[float], lag: int = 0
) -> dict:
    """OLS 회귀분석"""
    x_arr = np.array(x, dtype=float)
    y_arr = np.array(y, dtype=float)
    n = min(len(x_arr), len(y_arr))

    if lag > 0:
        x_arr = x_arr[: n - lag]
        y_arr = y_arr[lag:n]

    min_len = min(len(x_arr), len(y_arr))
    x_arr = x_arr[:min_len]
    y_arr = y_arr[:min_len]

    r_val, r_p = stats.pearsonr(x_arr, y_arr)

    X = add_constant(x_arr)
    model = OLS(y_arr, X).fit()

    return {
        "beta": float(model.params[1]),
        "beta_se": float(model.bse[1]),
        "r": float(r_val),
        "r_squared": float(model.rsquared),
        "p_value": float(model.pvalues[1]),
        "aic": float(model.aic),
        "n_obs": int(min_len),
    }


def run_granger(
    x: list[float], y: list[float], max_lag: int = 12
) -> dict | None:
    """그레인저 인과 검정"""
    x_arr = np.array(x, dtype=float)
    y_arr = np.array(y, dtype=float)
    n = min(len(x_arr), len(y_arr))
    x_arr = x_arr[:n]
    y_arr = y_arr[:n]

    if n < max_lag + 10:
        return None

    data = np.column_stack([y_arr, x_arr])
    try:
        result = grangercausalitytests(data, maxlag=max_lag, verbose=False)
        # Find the lag with lowest p-value
        best_lag = 1
        best_p = 1.0
        for lag_val, tests in result.items():
            p = tests[0]["ssr_ftest"][1]
            if p < best_p:
                best_p = p
                best_lag = lag_val
        return {"granger_p": float(best_p), "best_lag": int(best_lag)}
    except Exception:
        return None
