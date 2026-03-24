"use client";

import { useMemo } from "react";
import { useCausalStore } from "@/lib/store/causal-store";
import { calcAggregateImpact } from "@/lib/utils/impact-calc";

export default function ImpactSummary() {
  const project = useCausalStore((s) => s.project);

  const agg = useMemo(() => {
    if (!project || project.chains.length === 0) return null;
    return calcAggregateImpact(project.chains);
  }, [project]);

  if (!agg) return null;

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">합산 영향</span>
        {agg.totalImpact !== null ? (
          <span
            className="font-mono text-sm font-extrabold"
            style={{
              color:
                agg.totalImpact > 0
                  ? "var(--green)"
                  : agg.totalImpact < 0
                    ? "var(--red)"
                    : "var(--dim)",
            }}
          >
            {agg.totalImpact > 0 ? "+" : ""}
            {agg.totalImpact.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[11px] text-yellow">파라미터 입력 후 산출</span>
        )}
      </div>
      {agg.ci95 && (
        <div className="mt-1 font-mono text-[10px] text-dim">
          95% CI: [{agg.ci95[0].toFixed(2)}%, {agg.ci95[1].toFixed(2)}%]
        </div>
      )}
      {agg.incompleteChains > 0 && (
        <div className="mt-1 text-[10px] text-yellow">
          {agg.incompleteChains}개 체인 미정량
        </div>
      )}
      <div className="mt-1 text-[10px] text-dim">
        {agg.validChains}/{agg.validChains + agg.incompleteChains} 체인 기준
      </div>
    </div>
  );
}
