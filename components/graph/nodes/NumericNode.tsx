"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

// 노드 레이블이나 연결된 엣지의 명제에서 방향성을 추론
function inferDirection(label: string): "up" | "down" | "neutral" {
  const upWords = ["증가", "상승", "확대", "성장", "향상", "개선", "강화", "인상"];
  const downWords = ["감소", "하락", "축소", "둔화", "약화", "악화", "저하", "인하"];

  const lower = label.toLowerCase();
  for (const w of upWords) {
    if (lower.includes(w)) return "up";
  }
  for (const w of downWords) {
    if (lower.includes(w)) return "down";
  }
  return "neutral";
}

const DIRECTION_STYLE = {
  up: { symbol: "▲", color: "#6fcf97" },
  down: { symbol: "▼", color: "#eb5757" },
  neutral: { symbol: "—", color: "#7a7e90" },
};

function NumericNode({ data }: NodeProps) {
  const label = (data.label as string) ?? "";
  const chainColor = (data.chainColor as string) ?? "#5eaba2";
  const lines = label.split("\n");
  const direction = inferDirection(label);
  const dirStyle = DIRECTION_STYLE[direction];

  return (
    <div
      className="relative text-center"
      style={{
        minWidth: 120,
        maxWidth: 160,
        padding: "4px 10px",
        backgroundColor: "#2a3145",
        border: `1px solid ${chainColor}60`,
        borderRadius: "3px",
        boxShadow: `0 0 8px ${chainColor}15`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-background"
        style={{ backgroundColor: chainColor }}
      />

      <div className="flex flex-col items-center gap-0">
        {lines.map((line, i) => (
          <span
            key={i}
            className="block leading-tight"
            style={{
              fontSize: "11px",
              fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? "#ffffff" : "#b0b4c0",
              fontFamily: i > 0 ? "'Geist Mono', monospace" : undefined,
            }}
          >
            {line}
          </span>
        ))}
        {/* 방향성 표시 */}
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: dirStyle.color,
            marginTop: 1,
          }}
        >
          {dirStyle.symbol}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-background"
        style={{ backgroundColor: chainColor }}
      />
    </div>
  );
}

export default memo(NumericNode);
