"use client";

import { useCausalStore } from "@/lib/store/causal-store";
import EdgeDetail from "./EdgeDetail";

export default function DetailPanel() {
  const selectedEdgeId = useCausalStore((s) => s.selectedEdgeId);

  if (!selectedEdgeId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xs text-dim">
            엣지를 클릭하면 상세 정보가 표시됩니다
          </p>
        </div>
      </div>
    );
  }

  return <EdgeDetail />;
}
