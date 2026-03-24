"use client";

import { useCausalStore } from "@/lib/store/causal-store";
import type { Confidence, EdgeType } from "@/lib/types/causal";
import ParamEditor from "./ParamEditor";

const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  "event-numeric": "Event \u2192 Numeric",
  "numeric-numeric": "Numeric \u2192 Numeric",
  "event-event": "Event \u2192 Event",
  "numeric-event": "Numeric \u2192 Event",
};

const EDGE_TYPE_COLOR: Record<EdgeType, string> = {
  "event-numeric": "#7eb8d0",
  "numeric-numeric": "#5eaba2",
  "event-event": "#9b8ec4",
  "numeric-event": "#d4975a",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "var(--green)",
  medium: "var(--yellow)",
  low: "var(--red)",
};

export default function EdgeDetail() {
  const selectedEdgeId = useCausalStore((s) => s.selectedEdgeId);
  const getEdgeById = useCausalStore((s) => s.getEdgeById);
  const selectEdge = useCausalStore((s) => s.selectEdge);

  if (!selectedEdgeId) return null;

  const edge = getEdgeById(selectedEdgeId);
  if (!edge) return null;

  const typeColor = EDGE_TYPE_COLOR[edge.edgeType];

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header with close button */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{
              backgroundColor: `${typeColor}20`,
              color: typeColor,
              border: `1px solid ${typeColor}40`,
            }}
          >
            {EDGE_TYPE_LABEL[edge.edgeType]}
          </span>
        </div>
        <button
          onClick={() => selectEdge(null)}
          className="text-dim hover:text-foreground text-sm leading-none p-1"
        >
          &times;
        </button>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: CONFIDENCE_COLOR[edge.confidence] }}
        />
        <span className="text-xs text-soft">
          신뢰도: {CONFIDENCE_LABEL[edge.confidence]}
        </span>
      </div>

      {/* Time Lag */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-dim">시간 지연:</span>
        <span className="font-mono text-xs text-foreground">
          {edge.timeLag}년
        </span>
      </div>

      {/* Proposition */}
      <div>
        <h4 className="mb-1 text-xs font-semibold text-soft uppercase tracking-wider">
          인과 명제
        </h4>
        <p className="text-sm text-foreground leading-relaxed">
          {edge.proposition}
        </p>
      </div>

      {/* Param Editor */}
      <ParamEditor
        edgeId={edge.id}
        edgeType={edge.edgeType}
        params={edge.params}
      />

      {/* Rationale */}
      {edge.rationale && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-soft uppercase tracking-wider">
            추정 근거
          </h4>
          <p className="text-xs text-soft leading-relaxed whitespace-pre-wrap">
            {edge.rationale}
          </p>
        </div>
      )}

      {/* Sources */}
      {edge.sources.length > 0 && (
        <div>
          <h4 className="mb-1 text-xs font-semibold text-soft uppercase tracking-wider">
            근거 자료
          </h4>
          <ul className="space-y-1">
            {edge.sources.map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline"
                >
                  ↗ {source.label}
                </a>
                <span className="ml-1 text-[10px] text-dim">
                  [{source.type}]
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User Guide (추정 불가 시) */}
      {edge.paramMeta && Object.values(edge.paramMeta).some(
        (m) => (m as { status: string }).status === "pending"
      ) && (
        <div className="rounded border border-yellow/30 bg-yellow/5 p-3">
          <h4 className="mb-1 text-xs font-semibold text-yellow">
            직접 입력 가이드
          </h4>
          {Object.entries(edge.paramMeta).map(([key, meta]) => {
            const m = meta as { status: string; estimatedRange?: [number, number]; method?: string };
            if (m.status !== "pending") return null;
            return (
              <div key={key} className="mt-1">
                {m.estimatedRange && (
                  <p className="text-[11px] text-yellow/80">
                    추정 범위: {m.estimatedRange[0]} ~ {m.estimatedRange[1]}
                  </p>
                )}
                <p className="text-[10px] text-dim mt-0.5">{m.method}</p>
              </div>
            );
          })}
          <p className="mt-2 text-[10px] text-dim leading-relaxed">
            위 범위를 참고하여 파라미터를 직접 입력하거나,
            관련 데이터를 찾아 분석 후 입력해주세요.
          </p>
        </div>
      )}

      {/* 재추정 버튼 */}
      <button
        onClick={async () => {
          try {
            const res = await fetch("/api/params/auto-estimate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ edge }),
            });
            if (!res.ok) return;
            const result = await res.json();
            if (result.error) return;

            const store = useCausalStore.getState();
            store.updateEdge(edge.id, {
              params: { ...edge.params, ...result.params },
              paramMeta: { ...edge.paramMeta, ...result.paramMeta },
              rationale: result.rationale ?? edge.rationale,
              confidence: result.confidence ?? edge.confidence,
              sources: [...edge.sources, ...(result.sources ?? [])],
            });
          } catch (err) {
            console.error("재추정 실패:", err);
          }
        }}
        className="w-full rounded border border-border bg-card py-1.5 text-[11px] text-soft hover:bg-border/30 transition-colors"
      >
        재추정
      </button>
    </div>
  );
}
