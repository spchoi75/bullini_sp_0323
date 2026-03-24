import type {
  CausalChain,
  CausalEdge,
  ChainImpact,
  AggregateImpact,
  Confidence,
} from "@/lib/types/causal";

// ---------------------------------------------------------------------------
// Confidence → 수치 가중치
// ---------------------------------------------------------------------------

const CONFIDENCE_SCORE: Record<Confidence, number> = {
  high: 1.0,
  medium: 0.6,
  low: 0.3,
};

// ---------------------------------------------------------------------------
// 단일 엣지 전파 (4가지 규칙)
//
// 이벤트 노드에서 나가는 값 = 확률 (0~1)
// 수치 노드에서 나가는 값 = 변화량 (Δ%)
// ---------------------------------------------------------------------------

interface Signal {
  value: number;
  type: "probability" | "delta";
}

function propagateEdge(input: Signal, edge: CausalEdge): Signal | null {
  switch (edge.edgeType) {
    case "event-numeric": {
      // P_src × Δ → 기대 변화율 (%)
      if (edge.params.delta == null) return null;
      return { value: input.value * edge.params.delta, type: "delta" };
    }

    case "numeric-numeric": {
      // ΔX × β → ΔY
      if (edge.params.beta == null) return null;
      return { value: input.value * edge.params.beta, type: "delta" };
    }

    case "event-event": {
      // P_src × P(B|A) → P_B
      if (edge.params.probability == null) return null;
      return { value: input.value * edge.params.probability, type: "probability" };
    }

    case "numeric-event": {
      // sigmoid(ΔX, θ, k) → 이벤트 발생 확률
      if (edge.params.theta == null) return null;
      // k는 paramMeta에서 가져오거나, 기본값 10
      const k = 10;
      const p = 1 / (1 + Math.exp(-k * (input.value - edge.params.theta)));
      return { value: p, type: "probability" };
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// 체인 신뢰도 전파
// Numeric→Numeric에서 r²가 있으면 r²를, 없으면 confidence weight를 곱
// ---------------------------------------------------------------------------

function calcChainConfidence(edges: CausalEdge[]): number {
  let conf = 1;
  for (const edge of edges) {
    if (edge.edgeType === "numeric-numeric" && edge.params.r != null) {
      conf *= edge.params.r ** 2; // R² 사용
    } else {
      conf *= CONFIDENCE_SCORE[edge.confidence];
    }
  }
  return conf;
}

// ---------------------------------------------------------------------------
// 체인의 최대 p-value 추출 (가장 약한 고리)
// ---------------------------------------------------------------------------

function getMaxPValue(edges: CausalEdge[]): number {
  let maxP = 0;
  for (const edge of edges) {
    if (edge.params.p != null && edge.params.p > maxP) {
      maxP = edge.params.p;
    }
  }
  return maxP;
}

// ---------------------------------------------------------------------------
// 불확실성(σ) 전파: 상대 오차 전파법
// (σ_impact/impact)² = Σ(σ_param/param)²
// ---------------------------------------------------------------------------

function calcChainSigma(edges: CausalEdge[], impact: number): number {
  let relativeVariance = 0;

  for (const edge of edges) {
    // OLS 회귀의 beta 표준오차가 있으면 사용
    const betaSe = edge.paramMeta?.beta as
      | { estimatedRange?: [number, number] }
      | undefined;
    if (edge.edgeType === "numeric-numeric" && edge.params.beta != null) {
      if (betaSe?.estimatedRange) {
        const range = betaSe.estimatedRange;
        const sigma = (range[1] - range[0]) / 4; // 범위/4 ≈ 1σ
        if (edge.params.beta !== 0) {
          relativeVariance += (sigma / Math.abs(edge.params.beta)) ** 2;
        }
      } else {
        relativeVariance += 0.04; // 기본 20% 불확실성
      }
    } else if (edge.edgeType === "event-numeric" && edge.params.delta != null) {
      relativeVariance += 0.04;
    } else if (edge.edgeType === "event-event" && edge.params.probability != null) {
      relativeVariance += 0.09; // 확률 추정은 30% 불확실성
    }
  }

  return Math.abs(impact) * Math.sqrt(relativeVariance);
}

// ---------------------------------------------------------------------------
// 단일 체인 영향도 계산
// ---------------------------------------------------------------------------

export function calcChainImpact(chain: CausalChain): ChainImpact {
  if (chain.edges.length === 0) {
    return {
      chainId: chain.id,
      impact: null,
      confidence: 0,
      sigma: null,
      totalTimeLag: 0,
      isComplete: false,
    };
  }

  // 루트 노드의 초기 신호 결정
  const firstEdge = chain.edges[0];
  let signal: Signal;
  if (
    firstEdge.edgeType === "event-numeric" ||
    firstEdge.edgeType === "event-event"
  ) {
    signal = { value: 1.0, type: "probability" }; // 이벤트 발생 가정 (P=1)
  } else {
    signal = { value: 1.0, type: "delta" }; // 단위 변화 가정
  }

  // 체인 따라 순차 전파
  let isComplete = true;
  for (const edge of chain.edges) {
    const result = propagateEdge(signal, edge);
    if (result === null) {
      isComplete = false;
      break;
    }
    signal = result;
  }

  const impact = isComplete ? signal.value : null;
  const confidence = calcChainConfidence(chain.edges);
  const totalTimeLag = chain.edges.reduce((sum, e) => sum + e.timeLag, 0);
  const sigma = impact !== null ? calcChainSigma(chain.edges, impact) : null;

  return {
    chainId: chain.id,
    impact,
    confidence,
    sigma,
    totalTimeLag,
    isComplete,
  };
}

// ---------------------------------------------------------------------------
// 다중 체인 가중 합산
//
// Total = Σ(w_i × impact_i) / Σ(w_i)
// w_i = confidence × (1 - max_p_value) × completeness
// ---------------------------------------------------------------------------

export function calcAggregateImpact(
  chains: CausalChain[],
  timeHorizon?: number // 시간 필터 (년). undefined = 전체
): AggregateImpact {
  const perChain = chains.map(calcChainImpact);

  // 시간 필터 적용
  const filteredChains = timeHorizon != null
    ? perChain.filter((c) => c.totalTimeLag <= timeHorizon)
    : perChain;

  const completeChains = filteredChains.filter(
    (c) => c.isComplete && c.impact !== null
  );
  const incompleteChains = filteredChains.filter((c) => !c.isComplete).length;

  if (completeChains.length === 0) {
    return {
      totalImpact: null,
      sigma: null,
      ci95: null,
      validChains: 0,
      incompleteChains,
      perChain,
    };
  }

  // 가중 합산
  let weightedSum = 0;
  let totalWeight = 0;
  let varianceSum = 0;

  for (const ci of completeChains) {
    // 해당 체인의 edges에서 max p-value 추출
    const chainData = chains.find((c) => c.id === ci.chainId);
    const maxP = chainData ? getMaxPValue(chainData.edges) : 0;

    // w = confidence × (1 - p_value) × completeness(=1)
    const weight = ci.confidence * (1 - maxP);

    weightedSum += (ci.impact ?? 0) * weight;
    totalWeight += weight;

    if (ci.sigma !== null) {
      varianceSum += (ci.sigma * weight) ** 2;
    }
  }

  const totalImpact = totalWeight > 0 ? weightedSum / totalWeight : null;
  const sigma =
    totalWeight > 0 ? Math.sqrt(varianceSum) / totalWeight : null;
  const ci95: [number, number] | null =
    totalImpact !== null && sigma !== null
      ? [totalImpact - 1.96 * sigma, totalImpact + 1.96 * sigma]
      : null;

  return {
    totalImpact,
    sigma,
    ci95,
    validChains: completeChains.length,
    incompleteChains,
    perChain,
  };
}
