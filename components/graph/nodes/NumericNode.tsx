"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

function NumericNode({ data }: NodeProps) {
  const label = (data.label as string) ?? "";
  const chainColor = (data.chainColor as string) ?? "#5eaba2";
  const lines = label.split("\n");

  return (
    <div
      className="relative text-center"
      style={{
        minWidth: 120,
        maxWidth: 150,
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
