"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import ThreePanel from "@/components/layout/ThreePanel";
import CausalGraph from "@/components/graph/CausalGraph";
import DetailPanel from "@/components/detail/DetailPanel";
import TopicInput from "@/components/news/TopicInput";
import NewsPanel from "@/components/news/NewsPanel";
import ChainList from "@/components/summary/ChainList";
import ImpactSummary from "@/components/summary/ImpactSummary";
import Legend from "@/components/summary/Legend";
import { useCausalStore } from "@/lib/store/causal-store";
import type { CausalProject, CausalEdge } from "@/lib/types/causal";

export default function Home() {
  const setProject = useCausalStore((s) => s.setProject);
  const isGenerating = useCausalStore((s) => s.isGenerating);
  const setGenerating = useCausalStore((s) => s.setGenerating);
  const isEstimating = useCausalStore((s) => s.isEstimating);
  const setEstimating = useCausalStore((s) => s.setEstimating);
  const updateEdge = useCausalStore((s) => s.updateEdge);
  const selectedEdgeId = useCausalStore((s) => s.selectedEdgeId);

  // 모든 엣지에 대해 자동 추정 실행 (3개씩 병렬 배치)
  const runAutoEstimate = useCallback(
    async (chains: { edges: CausalEdge[] }[]) => {
      const allEdges = chains.flatMap((c) => c.edges);
      if (allEdges.length === 0) return;

      setEstimating(true);
      // 모든 엣지를 한 번에 병렬 처리
      const BATCH_SIZE = allEdges.length; // 전부 동시 실행

      for (let i = 0; i < allEdges.length; i += BATCH_SIZE) {
        const batch = allEdges.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (edge) => {
            const res = await fetch("/api/params/auto-estimate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ edge }),
            });
            if (!res.ok) return null;
            const result = await res.json();
            return result.error ? null : { edgeId: edge.id, edge, result };
          })
        );

        // 배치 결과 즉시 스토어에 반영
        for (const r of results) {
          if (r.status === "fulfilled" && r.value) {
            const { edgeId, edge, result } = r.value;
            updateEdge(edgeId, {
              params: { ...edge.params, ...result.params },
              paramMeta: { ...edge.paramMeta, ...result.paramMeta },
              rationale: result.rationale ?? edge.rationale,
              confidence: result.confidence ?? edge.confidence,
              sources: [...edge.sources, ...(result.sources ?? [])],
            });
          }
        }
      }

      setEstimating(false);
      toast.success("파라미터 자동 추정 완료");
    },
    [setEstimating, updateEdge]
  );

  const setGenerationStep = useCausalStore((s) => s.setGenerationStep);

  const handleTopicSubmit = useCallback(
    async (topic: string) => {
      setGenerating(true);
      setGenerationStep("Step 1/4: 주제 분석 + 뉴스 검색 중...");
      try {
        // 단계 진행 시뮬레이션 (API 내부에서 4단계 실행)
        const stepTimer = setTimeout(() => setGenerationStep("Step 2/4: X→Y 경제학적 분해 중..."), 8000);
        const stepTimer2 = setTimeout(() => setGenerationStep("Step 3/4: 다양한 원인 발굴 중..."), 25000);
        const stepTimer3 = setTimeout(() => setGenerationStep("Step 4/4: 체인 통합 검증 중..."), 55000);

        const res = await fetch("/api/chain/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, articles: [] }),
        });

        clearTimeout(stepTimer);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);

        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();

        const project: CausalProject = {
          id: crypto.randomUUID(),
          title: topic,
          targetAsset: data.targetAsset ?? topic,
          chains: data.chains,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProject(project);

        // 체인 생성 직후 자동 추정 시작 (비동기, UI 블로킹 없음)
        runAutoEstimate(data.chains);
      } catch (err) {
        console.error("체인 생성 실패:", err);
        toast.error(
          err instanceof Error
            ? `체인 생성 실패: ${err.message}`
            : "체인 생성 실패"
        );
      } finally {
        setGenerating(false);
        setGenerationStep(null);
      }
    },
    [setProject, setGenerating, setGenerationStep, runAutoEstimate]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <ThreePanel
        left={
          <div className="flex h-full flex-col">
            <TopicInput
              onSubmit={handleTopicSubmit}
              isLoading={isGenerating}
            />
            <NewsPanel />
            {isEstimating && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                <span className="text-[10px] text-accent">파라미터 자동 추정 중...</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">
              <ChainList />
              <ImpactSummary />
              {selectedEdgeId && (
                <div className="border-t border-border">
                  <DetailPanel />
                </div>
              )}
            </div>
            <Legend />
          </div>
        }
        center={<CausalGraph />}
      />
    </div>
  );
}
