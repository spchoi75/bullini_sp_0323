"use client";

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import type { EdgeParams, Confidence } from "@/lib/types/causal";

const CONFIDENCE_COLOR: Record<Confidence, string> = {
  high: "var(--green)",
  medium: "var(--yellow)",
  low: "var(--red)",
};

function getMainParam(edgeType: string, params: Partial<EdgeParams>): number | null {
  switch (edgeType) {
    case "event-numeric": return params.delta ?? null;
    case "numeric-numeric": return params.beta ?? null;
    case "event-event": return params.probability ?? null;
    case "numeric-event": return params.theta ?? null;
    default: return null;
  }
}

function formatTopLabel(edgeType: string, params: Partial<EdgeParams>): string {
  switch (edgeType) {
    case "event-numeric":
      return params.delta != null ? `Δ=${params.delta > 0 ? "+" : ""}${params.delta}%` : "Δ=?";
    case "numeric-numeric":
      return params.beta != null ? `β=${params.beta}` : "β=?";
    case "event-event":
      return params.probability != null ? `P=${(params.probability * 100).toFixed(0)}%` : "P=?";
    case "numeric-event":
      return params.theta != null ? `θ=${params.theta}` : "θ=?";
    default: return "";
  }
}

function formatBottomLabel(edgeType: string, params: Partial<EdgeParams>): string {
  if (edgeType === "numeric-numeric") {
    const parts: string[] = [];
    if (params.r != null) parts.push(`r=${params.r}`);
    else parts.push("r=?");
    if (params.p != null) {
      parts.push(params.p < 0.001 ? `p=${params.p.toExponential(0)}` : `p=${params.p.toFixed(3)}`);
    }
    return parts.join("  ");
  }
  return "";
}

function hasNullParams(edgeType: string, params: Partial<EdgeParams>): boolean {
  switch (edgeType) {
    case "event-numeric": return params.delta == null;
    case "numeric-numeric": return params.beta == null || params.r == null;
    case "event-event": return params.probability == null;
    case "numeric-event": return params.theta == null;
    default: return false;
  }
}

function edgeTypeName(t: string): string {
  const m: Record<string, string> = {
    "event-numeric": "Event→Numeric",
    "numeric-numeric": "Numeric→Numeric",
    "event-event": "Event→Event",
    "numeric-event": "Numeric→Event",
  };
  return m[t] ?? t;
}

function CausalEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const edgeType = (data?.edgeType as string) ?? "numeric-numeric";
  const params = (data?.params as Partial<EdgeParams>) ?? {};
  const confidence = (data?.confidence as Confidence) ?? "medium";
  const isFinalConnector = (data?.isFinalConnector as boolean) ?? false;
  const isDashed = hasNullParams(edgeType, params);

  // 신뢰도 → 화살표 색상
  const strokeColor = CONFIDENCE_COLOR[confidence];

  // 영향 강도 → 굵기 (1~4px)
  const mainParam = getMainParam(edgeType, params);
  const absValue = mainParam != null ? Math.abs(mainParam) : 0;
  const baseWidth = mainParam != null
    ? Math.min(Math.max(1 + absValue * 0.05, 1.2), 4)
    : 1;
  const strokeWidth = selected ? baseWidth + 1 : baseWidth;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const topLabel = isFinalConnector ? "" : formatTopLabel(edgeType, params);
  const bottomLabel = isFinalConnector ? "" : formatBottomLabel(edgeType, params);
  const isNull = isDashed && !isFinalConnector;

  const timeLag = (data?.timeLag as number) ?? 0;

  return (
    <>
      {/* 클릭+호버 히트 영역 */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        className="react-flow__edge-interaction"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isDashed ? "5 3" : undefined,
          opacity: selected ? 1 : 0.65,
        }}
        markerEnd={`url(#marker-${confidence})`}
      />

      {/* 파라미터 라벨: 엣지 위/아래에 배치 */}
      {(topLabel || bottomLabel) && (
        <EdgeLabelRenderer>
          {/* 위쪽 라벨 (주 파라미터) */}
          {topLabel && (
            <div
              className="nodrag nopan pointer-events-none"
              style={{
                position: "absolute",
                transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 8}px)`,
                fontSize: "10px",
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 700,
                color: isNull ? "#c0a860" : "#e8ecf0",
                whiteSpace: "nowrap",
              }}
            >
              {topLabel}
            </div>
          )}

          {/* 아래쪽 라벨 (r, p-value) */}
          {bottomLabel && (
            <div
              className="nodrag nopan pointer-events-none"
              style={{
                position: "absolute",
                transform: `translate(-50%, 0%) translate(${labelX}px, ${labelY + 6}px)`,
                fontSize: "9px",
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 500,
                color: "#9a9eb0",
                whiteSpace: "nowrap",
              }}
            >
              {bottomLabel}
            </div>
          )}
        </EdgeLabelRenderer>
      )}

      {/* 호버 툴팁 */}
      {hovered && !isFinalConnector && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none"
            style={{
              position: "absolute",
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 24}px)`,
              backgroundColor: "var(--tooltip-bg)",
              border: "1px solid var(--tooltip-border)",
              borderRadius: "6px",
              padding: "6px 10px",
              fontSize: "9px",
              color: "var(--foreground)",
              whiteSpace: "nowrap",
              zIndex: 50,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 2, color: strokeColor }}>
              {edgeTypeName(edgeType)}
            </div>
            <div>{topLabel}{bottomLabel ? ` · ${bottomLabel}` : ""}</div>
            {timeLag > 0 && <div style={{ color: "var(--dim)" }}>지연: {timeLag}년</div>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CausalEdgeComponent);
