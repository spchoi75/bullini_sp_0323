"use client";

import { useCausalStore } from "@/lib/store/causal-store";

export default function Header() {
  const project = useCausalStore((s) => s.project);
  const isGenerating = useCausalStore((s) => s.isGenerating);
  const generationStep = useCausalStore((s) => s.generationStep);
  const isEstimating = useCausalStore((s) => s.isEstimating);
  const getNullParamCount = useCausalStore((s) => s.getNullParamCount);
  const nullCount = getNullParamCount();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex h-[40px] items-center justify-between border-b border-border px-4"
      style={{ backgroundColor: "var(--panel)" }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-foreground">
          Bullini Causal Map
        </span>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-xs text-dim">
          {project?.title ?? "인과 그래프 분석 플랫폼"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isGenerating && generationStep && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium text-accent">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            {generationStep}
          </span>
        )}
        {isEstimating && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-medium text-accent">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            추정 중
          </span>
        )}
        {nullCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow/15 px-2.5 py-0.5 text-[10px] font-medium text-yellow">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow" />
            {nullCount}개 미입력
          </span>
        )}
      </div>
    </header>
  );
}
