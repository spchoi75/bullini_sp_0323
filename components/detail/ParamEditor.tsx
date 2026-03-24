"use client";

import { useState, useCallback } from "react";
import type { EdgeType, EdgeParams } from "@/lib/types/causal";
import { useCausalStore } from "@/lib/store/causal-store";

interface ParamField {
  key: keyof EdgeParams;
  label: string;
  unit: string;
}

const PARAM_FIELDS: Record<EdgeType, ParamField[]> = {
  "event-numeric": [{ key: "delta", label: "\u0394 (변화량)", unit: "%" }],
  "numeric-numeric": [
    { key: "beta", label: "\u03B2 (회귀 기울기)", unit: "" },
    { key: "r", label: "r (상관계수)", unit: "" },
    { key: "p", label: "P-value", unit: "" },
  ],
  "event-event": [{ key: "probability", label: "P (발생 확률)", unit: "" }],
  "numeric-event": [{ key: "theta", label: "\u03B8 (임계점)", unit: "" }],
};

interface ParamEditorProps {
  edgeId: string;
  edgeType: EdgeType;
  params: EdgeParams;
}

export default function ParamEditor({
  edgeId,
  edgeType,
  params,
}: ParamEditorProps) {
  const updateEdgeParams = useCausalStore((s) => s.updateEdgeParams);
  const fields = PARAM_FIELDS[edgeType] ?? [];
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = useCallback(
    (key: string, currentValue: number | null | undefined) => {
      setEditingKey(key);
      setEditValue(currentValue != null ? String(currentValue) : "");
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(
    (key: keyof EdgeParams) => {
      const numVal = parseFloat(editValue);
      if (!isNaN(numVal)) {
        updateEdgeParams(edgeId, { [key]: numVal });
      }
      setEditingKey(null);
      setEditValue("");
    },
    [edgeId, editValue, updateEdgeParams]
  );

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-soft uppercase tracking-wider">
        파라미터
      </h4>
      <div className="space-y-1.5">
        {fields.map((field) => {
          const value = params[field.key];
          const isNull = value === null || value === undefined;
          const isEditing = editingKey === field.key;

          return (
            <div
              key={field.key}
              className={`flex items-center justify-between rounded px-3 py-2 ${
                isNull ? "bg-yellow/10 border border-yellow/30" : "bg-card"
              }`}
            >
              <span className="text-xs text-soft">
                {field.label}
                {field.unit && (
                  <span className="ml-1 text-dim">({field.unit})</span>
                )}
              </span>

              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="any"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(field.key);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-6 w-20 rounded border border-border bg-background px-1.5 text-xs font-mono text-foreground outline-none focus:border-accent"
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(field.key)}
                    className="text-[10px] text-accent hover:underline"
                  >
                    저장
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-[10px] text-dim hover:text-soft"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(field.key, value)}
                  className="text-xs font-mono hover:text-accent transition-colors"
                >
                  {isNull ? (
                    <span className="text-yellow">&mdash;</span>
                  ) : (
                    <span className="text-foreground">{value}</span>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
