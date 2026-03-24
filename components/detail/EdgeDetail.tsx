"use client";

import { useState } from "react";
import { useCausalStore } from "@/lib/store/causal-store";
import type { Confidence, EdgeType, CausalEdge } from "@/lib/types/causal";
import ParamEditor from "./ParamEditor";

function BayesianUpdateButton({ edge }: { edge: CausalEdge }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    prior: number;
    posterior: number;
    delta: number;
    needsConfirmation: boolean;
    evidences: { evidence: string; lr: number; reasoning: string }[];
  } | null>(null);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const fromLabel = edge.proposition.split("하면")[0]?.trim() ?? "";
      const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? "";
      const res = await fetch("/api/params/bayesian-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventA: fromLabel,
          eventB: toLabel,
          currentProbability: edge.params.probability,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.updated) setResult(data);
    } catch (err) {
      console.error("베이지안 업데이트 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyUpdate = () => {
    if (!result) return;
    const store = useCausalStore.getState();
    store.updateEdgeParams(edge.id, { probability: result.posterior });
    setResult(null);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleUpdate}
        disabled={loading}
        className="w-full rounded border border-accent/40 bg-accent/10 py-1.5 text-[11px] text-accent hover:bg-accent/20 transition-colors disabled:opacity-50"
      >
        {loading ? "뉴스 검색 중..." : "뉴스로 확률 업데이트"}
      </button>

      {result && (
        <div className="rounded border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-dim">현재</span>
            <span className="font-mono text-xs text-soft">{result.prior}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-dim">업데이트</span>
            <span
              className="font-mono text-xs font-bold"
              style={{
                color: result.posterior > result.prior ? "var(--green)" : "var(--red)",
              }}
            >
              {result.posterior}
            </span>
          </div>
          {result.evidences.slice(0, 3).map((ev, i) => (
            <div key={i} className="text-[9px] text-dim leading-relaxed">
              LR={ev.lr}: {ev.reasoning.slice(0, 80)}
            </div>
          ))}
          {result.needsConfirmation && (
            <p className="text-[10px] text-yellow">
              변화폭이 큽니다 ({(result.delta * 100).toFixed(0)}%p)
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={applyUpdate} className="flex-1 rounded bg-accent py-1 text-[10px] font-bold text-background">
              적용
            </button>
            <button onClick={() => setResult(null)} className="flex-1 rounded border border-border py-1 text-[10px] text-dim">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const EDGE_TYPE_LABEL: Record<EdgeType, string> = {
  "event-numeric": "Event \u2192 Numeric",
  "numeric-numeric": "Numeric \u2192 Numeric",
  "event-event": "Event \u2192 Event",
  "numeric-event": "Numeric \u2192 Event",
};

const EDGE_TYPE_COLOR: Record<EdgeType, string> = {
  "event-numeric": "var(--chain-1)",
  "numeric-numeric": "var(--chain-2)",
  "event-event": "var(--chain-3)",
  "numeric-event": "var(--chain-5)",
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
        paramMeta={edge.paramMeta}
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

      {/* 베이지안 업데이트 버튼 (event-event 엣지만) */}
      {edge.edgeType === "event-event" && edge.params.probability != null && (
        <BayesianUpdateButton edge={edge} />
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
