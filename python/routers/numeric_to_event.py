"""Module D: Numeric → Event (θ) 임계값 추정"""

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

router = APIRouter()


class NumericToEventRequest(BaseModel):
    x_series: list[float]
    event_binary: list[int]
    method: str = "logistic"


@router.post("/numeric-to-event")
async def compute_numeric_to_event(req: NumericToEventRequest):
    x = np.array(req.x_series, dtype=float).reshape(-1, 1)
    y = np.array(req.event_binary, dtype=int)

    min_len = min(len(x), len(y))
    x = x[:min_len]
    y = y[:min_len]

    if len(np.unique(y)) < 2:
        return {
            "error": "이벤트가 한 종류만 존재합니다",
            "theta": None,
            "threshold_type": None,
            "confidence": "low",
        }

    if req.method == "logistic":
        model = LogisticRegression(max_iter=1000)
        model.fit(x, y)

        beta0 = float(model.intercept_[0])
        beta1 = float(model.coef_[0][0])

        # θ = -β₀/β₁ (P=0.5 지점)
        theta = -beta0 / beta1 if abs(beta1) > 1e-10 else None

        # ROC AUC
        y_prob = model.predict_proba(x)[:, 1]
        try:
            auc = float(roc_auc_score(y, y_prob))
        except ValueError:
            auc = None

        # 신뢰도
        if auc and auc > 0.8:
            confidence = "high"
        elif auc and auc > 0.65:
            confidence = "medium"
        else:
            confidence = "low"

        return {
            "theta": theta,
            "threshold_type": "soft",
            "sigmoid_beta0": beta0,
            "sigmoid_beta1": beta1,
            "roc_auc": auc,
            "confidence": confidence,
            "p_value": None,  # logistic doesn't give simple p-value
            "n_obs": int(min_len),
            "n_events": int(np.sum(y)),
        }

    return {"error": f"Unknown method: {req.method}"}
