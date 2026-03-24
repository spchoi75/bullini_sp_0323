import type {
  CausalChain,
  CausalEdge,
  ChainImpact,
  AggregateImpact,
  Confidence,
} from "@/lib/types/causal";

// ---------------------------------------------------------------------------
// Confidence -> numeric weight
// ---------------------------------------------------------------------------

const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
};

// ---------------------------------------------------------------------------
// Edge-level impact multiplier
// ---------------------------------------------------------------------------

function edgeMultiplier(edge: CausalEdge): number | null {
  const { params, edgeType } = edge;

  switch (edgeType) {
    case "event-numeric":
      return params.delta ?? null;
    case "numeric-numeric":
      return params.beta ?? null;
    case "event-event":
      return params.probability ?? null;
    case "numeric-event":
      return params.theta != null ? 1 : null; // threshold edges contribute pass-through
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Chain-level impact
// ---------------------------------------------------------------------------

export function calcChainImpact(chain: CausalChain): ChainImpact {
  let impact: number | null = 1;
  let confidenceProduct = 1;
  let totalTimeLag = 0;
  let isComplete = true;

  for (const edge of chain.edges) {
    const m = edgeMultiplier(edge);
    if (m === null) {
      isComplete = false;
      impact = null;
    } else if (impact !== null) {
      impact *= m;
    }

    confidenceProduct *= CONFIDENCE_WEIGHT[edge.confidence];
    totalTimeLag += edge.timeLag;
  }

  // Convert to percentage if still valid
  const finalImpact = impact !== null ? impact : null;

  return {
    chainId: chain.id,
    impact: finalImpact,
    confidence: confidenceProduct,
    sigma: finalImpact !== null ? Math.abs(finalImpact) * 0.2 : null, // rough 20% uncertainty
    totalTimeLag,
    isComplete,
  };
}

// ---------------------------------------------------------------------------
// Aggregate impact across all chains
// ---------------------------------------------------------------------------

export function calcAggregateImpact(chains: CausalChain[]): AggregateImpact {
  const perChain = chains.map(calcChainImpact);
  const completeChains = perChain.filter((c) => c.isComplete && c.impact !== null);
  const incompleteChains = perChain.filter((c) => !c.isComplete).length;

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

  // Weighted sum: weight = confidence * (1 - p_value_proxy)
  let weightedSum = 0;
  let totalWeight = 0;
  let varianceSum = 0;

  for (const ci of completeChains) {
    const weight = ci.confidence;
    weightedSum += (ci.impact ?? 0) * weight;
    totalWeight += weight;
    if (ci.sigma !== null) {
      varianceSum += (ci.sigma * weight) ** 2;
    }
  }

  const totalImpact = totalWeight > 0 ? weightedSum / totalWeight : null;
  const sigma = totalWeight > 0 ? Math.sqrt(varianceSum) / totalWeight : null;
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
