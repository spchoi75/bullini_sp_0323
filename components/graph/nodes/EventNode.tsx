"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";

function EventNode({ data }: NodeProps) {
  const label = (data.label as string) ?? "";
  const chainColor = (data.chainColor as string) ?? "#5eaba2";
  const isRoot = (data.isRoot as boolean) ?? false;
  const lines = label.split("\n");

  return (
    <div
      className="relative flex items-center justify-center text-center"
      style={{
        minWidth: 120,
        maxWidth: 150,
        minHeight: 42,
        padding: "4px 10px",
        borderRadius: "50%",
        border: `2px solid ${chainColor}`,
        backgroundColor: `${chainColor}35`,
        boxShadow: `0 0 10px ${chainColor}20`,
      }}
    >
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2 !w-2 !border-2 !border-background"
          style={{ backgroundColor: chainColor }}
        />
      )}

      <div className="flex flex-col items-center gap-0">
        {lines.map((line, i) => (
          <span
            key={i}
            className="block leading-tight"
            style={{
              fontSize: "11px",
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? "#e8eaef" : "#a0a4b0",
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

export default memo(EventNode);
