"use client";

import { useMemo, useState } from "react";
import { useCausalStore } from "@/lib/store/causal-store";
import { calcAggregateImpact } from "@/lib/utils/impact-calc";

const TIME_FILTERS = [
  { label: "6개월", value: 0.5 },
  { label: "1년", value: 1.0 },
  { label: "전체", value: undefined },
] as const;

export default function ImpactSummary() {
  const project = useCausalStore((s) => s.project);
  const [timeFilter, setTimeFilter] = useState<number | undefined>(undefined);

  const agg = useMemo(() => {
    if (!project || project.chains.length === 0) return null;
    return calcAggregateImpact(project.chains, timeFilter);
  }, [project, timeFilter]);

  if (!agg) return null;

  return (
    <div className="border-t border-border p-3">
      {/* 시간 필터 */}
      <div className="mb-2 flex items-center gap-1">
        {TIME_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setTimeFilter(f.value)}
            className={`rounded px-2 py-0.5 text-[9px] font-medium transition-colors ${
              timeFilter === f.value
                ? "bg-accent text-background"
                : "border border-border text-dim hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 합산 영향도 */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">합산 영향</span>
        {agg.totalImpact !== null ? (
          <span
            className={`font-mono text-sm font-extrabold ${
              agg.totalImpact > 0
                ? "text-up"
                : agg.totalImpact < 0
                  ? "text-down"
                  : "text-dim"
            }`}
          >
            {agg.totalImpact > 0 ? "+" : ""}
            {agg.totalImpact.toFixed(2)}%
          </span>
        ) : (
          <span className="text-[11px] text-yellow">파라미터 입력 후 산출</span>
        )}
      </div>

      {/* 95% CI */}
      {agg.ci95 && (
        <div className="mt-1 font-mono text-[10px] text-dim">
          95% CI: [{agg.ci95[0].toFixed(2)}%, {agg.ci95[1].toFixed(2)}%]
        </div>
      )}

      {/* 체인 수 */}
      <div className="mt-1 flex items-center gap-2 text-[10px]">
        <span className="text-dim">
          {agg.validChains}/{agg.validChains + agg.incompleteChains} 체인 기준
        </span>
        {agg.incompleteChains > 0 && (
          <span className="text-yellow">
            {agg.incompleteChains}개 정량화 불가
          </span>
        )}
      </div>
    </div>
  );
}
