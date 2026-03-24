"""영향도 전파 & 합산 계산"""

import math
from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()


class ChainEdge(BaseModel):
    edge_type: str
    delta: float | None = None
    beta: float | None = None
    r_squared: float | None = None
    probability: float | None = None
    theta: float | None = None
    sigma_param: float | None = None
    p_value: float | None = None
    confidence: str = "medium"


class PropagateRequest(BaseModel):
    edges: list[ChainEdge]


class PropagateResponse(BaseModel):
    impact: float | None
    confidence: float
    sigma: float | None
    signal_type: str
    is_complete: bool


class AggregateRequest(BaseModel):
    chains: list[PropagateResponse]


class MonteCarloRequest(BaseModel):
    chains: list[dict]
    n_simulations: int = 10000


CONF_WEIGHT = {"high": 0.9, "medium": 0.6, "low": 0.3}


@router.post("/propagate")
async def compute_propagate(req: PropagateRequest):
    impact: float | None = 1.0
    conf_product = 1.0
    is_complete = True
    signal_type = "event"
    relative_var = 0.0

    for edge in req.edges:
        multiplier: float | None = None

        if edge.edge_type == "event-numeric":
            multiplier = edge.delta
            signal_type = "numeric"
        elif edge.edge_type == "numeric-numeric":
            multiplier = edge.beta
            r2 = edge.r_squared if edge.r_squared else 0.5
            conf_product *= r2
            signal_type = "numeric"
        elif edge.edge_type == "event-event":
            multiplier = edge.probability
            signal_type = "event"
        elif edge.edge_type == "numeric-event":
            multiplier = 1.0 if edge.theta is not None else None
            signal_type = "event"

        if multiplier is None:
            is_complete = False
            impact = None
        elif impact is not None:
            impact *= multiplier
            if edge.sigma_param and multiplier != 0:
                relative_var += (edge.sigma_param / abs(multiplier)) ** 2

        conf_product *= CONF_WEIGHT.get(edge.confidence, 0.6)

    sigma = abs(impact) * math.sqrt(relative_var) if impact and relative_var > 0 else None

    return PropagateResponse(
        impact=impact,
        confidence=conf_product,
        sigma=sigma,
        signal_type=signal_type,
        is_complete=is_complete,
    )


@router.post("/aggregate")
async def compute_aggregate(req: AggregateRequest):
    valid = [c for c in req.chains if c.is_complete and c.impact is not None]
    incomplete = [c for c in req.chains if not c.is_complete]

    if not valid:
        return {
            "total_impact": None,
            "sigma": None,
            "ci_95": None,
            "n_valid": 0,
            "n_incomplete": len(incomplete),
            "per_chain": [c.model_dump() for c in req.chains],
        }

    weighted_sum = 0.0
    total_weight = 0.0
    variance_sum = 0.0

    for c in valid:
        w = c.confidence
        weighted_sum += (c.impact or 0) * w
        total_weight += w
        if c.sigma:
            variance_sum += (c.sigma * w) ** 2

    total_impact = weighted_sum / total_weight if total_weight > 0 else None
    sigma = math.sqrt(variance_sum) / total_weight if total_weight > 0 else None

    ci_95 = None
    if total_impact is not None and sigma is not None:
        ci_95 = (total_impact - 1.96 * sigma, total_impact + 1.96 * sigma)

    return {
        "total_impact": total_impact,
        "sigma": sigma,
        "ci_95": ci_95,
        "n_valid": len(valid),
        "n_incomplete": len(incomplete),
        "per_chain": [c.model_dump() for c in req.chains],
    }


@router.post("/monte-carlo")
async def compute_monte_carlo(req: MonteCarloRequest):
    results = []
    rng = np.random.default_rng(42)

    for _ in range(req.n_simulations):
        total = 0.0
        for chain in req.chains:
            edges = chain.get("edges", [])
            chain_impact = 1.0
            skip = False

            for edge in edges:
                etype = edge.get("edge_type", "")
                if etype == "event-numeric":
                    d = edge.get("delta")
                    if d is None:
                        skip = True
                        break
                    sigma = edge.get("sigma_param", abs(d) * 0.1)
                    chain_impact *= rng.normal(d, sigma)
                elif etype == "numeric-numeric":
                    b = edge.get("beta")
                    if b is None:
                        skip = True
                        break
                    sigma = edge.get("sigma_param", abs(b) * 0.1)
                    chain_impact *= rng.normal(b, sigma)
                elif etype == "event-event":
                    p = edge.get("probability")
                    if p is None:
                        skip = True
                        break
                    if rng.random() > p:
                        chain_impact = 0.0
                        break
                elif etype == "numeric-event":
                    if edge.get("theta") is None:
                        skip = True
                        break

            if not skip:
                total += chain_impact
            results.append(total)

    arr = np.array(results)
    return {
        "mean": float(np.mean(arr)),
        "median": float(np.median(arr)),
        "std": float(np.std(arr)),
        "ci_95": (float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5))),
        "ci_80": (float(np.percentile(arr, 10)), float(np.percentile(arr, 90))),
        "p_positive": float(np.mean(arr > 0)),
        "n_simulations": req.n_simulations,
    }
