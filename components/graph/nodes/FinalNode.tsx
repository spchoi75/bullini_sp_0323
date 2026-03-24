"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

function FinalNode({ data }: NodeProps) {
  const label = (data.label as string) ?? "타겟 자산";
  const totalImpact = data.totalImpact as number | null;

  return (
    <div
      className="relative text-center"
      style={{
        minWidth: 110,
        maxWidth: 140,
        padding: "6px 10px",
        borderRadius: "6px",
        border: "2px solid var(--accent)",
        backgroundColor: "var(--final-node-bg)",
        boxShadow: "0 0 16px rgba(94,171,162,0.2)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-background"
        style={{ backgroundColor: "var(--accent)" }}
      />

      <div className="flex flex-col items-center gap-1">
        <span style={{ fontSize: "9px", fontWeight: 700, color: "#7fd4cb" }}>
          {label}
        </span>
        {totalImpact !== null && totalImpact !== undefined ? (
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              fontFamily: "'Geist Mono', monospace",
              color: totalImpact >= 0 ? "var(--green)" : "var(--red)",
            }}
          >
            {totalImpact >= 0 ? "+" : ""}
            {totalImpact.toFixed(1)}%
          </span>
        ) : (
          <span style={{ fontSize: "8px", color: "var(--dim)" }}>
            미산출
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(FinalNode);
