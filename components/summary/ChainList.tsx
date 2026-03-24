"use client";

import { useCausalStore } from "@/lib/store/causal-store";
import { calcChainImpact } from "@/lib/utils/impact-calc";

export default function ChainList() {
  const project = useCausalStore((s) => s.project);
  const hoveredChainId = useCausalStore((s) => s.hoveredChainId);
  const hoverChain = useCausalStore((s) => s.hoverChain);
  const selectEdge = useCausalStore((s) => s.selectEdge);

  if (!project || project.chains.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-dim">
        인과 체인이 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-1 p-3">
      <div className="mb-2 text-[10px] font-bold tracking-wider text-dim">
        체인별 최종 영향도
      </div>
      {project.chains.map((chain) => {
        const impact = calcChainImpact(chain);
        const dimmed = hoveredChainId !== null && hoveredChainId !== chain.id;
        return (
          <div
            key={chain.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 transition-opacity hover:bg-white/5"
            style={{ opacity: dimmed ? 0.3 : 1 }}
            onMouseEnter={() => hoverChain(chain.id)}
            onMouseLeave={() => hoverChain(null)}
            onClick={() => {
              const firstEdge = chain.edges[0];
              if (firstEdge) selectEdge(firstEdge.id);
            }}
          >
            <div
              className="h-2 w-2 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: chain.color }}
            />
            <span className="flex-1 text-xs font-semibold text-foreground">
              {chain.label}
            </span>
            {impact.impact !== null ? (
              <span
                className="font-mono text-xs font-bold"
                style={{
                  color:
                    impact.impact > 0
                      ? "var(--green)"
                      : impact.impact < 0
                        ? "var(--red)"
                        : "var(--dim)",
                }}
              >
                {impact.impact > 0 ? "+" : ""}
                {impact.impact.toFixed(2)}%
              </span>
            ) : (
              <span className="font-mono text-[10px] text-yellow">
                입력 필요
              </span>
            )}
            <span className="font-mono text-[9px] text-dim">
              {impact.totalTimeLag}yr
            </span>
          </div>
        );
      })}
    </div>
  );
}
