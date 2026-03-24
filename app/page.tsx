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
import type { CausalProject, CausalChain, CausalEdge } from "@/lib/types/causal";

export default function Home() {
  const setProject = useCausalStore((s) => s.setProject);
  const addChain = useCausalStore((s) => s.addChain);
  const isGenerating = useCausalStore((s) => s.isGenerating);
  const setGenerating = useCausalStore((s) => s.setGenerating);
  const isEstimating = useCausalStore((s) => s.isEstimating);
  const setEstimating = useCausalStore((s) => s.setEstimating);
  const updateEdge = useCausalStore((s) => s.updateEdge);
  const selectedEdgeId = useCausalStore((s) => s.selectedEdgeId);
  const setGenerationStep = useCausalStore((s) => s.setGenerationStep);

  // 단일 엣지 자동 추정
  const estimateEdge = useCallback(
    async (edge: CausalEdge) => {
      try {
        const res = await fetch("/api/params/auto-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ edge }),
        });
        if (!res.ok) return;
        const result = await res.json();
        if (result.error) return;

        updateEdge(edge.id, {
          params: { ...edge.params, ...result.params },
          paramMeta: { ...edge.paramMeta, ...result.paramMeta },
          rationale: result.rationale ?? edge.rationale,
          confidence: result.confidence ?? edge.confidence,
          sources: [...edge.sources, ...(result.sources ?? [])],
        });
      } catch {
        // 개별 엣지 추정 실패 무시
      }
    },
    [updateEdge]
  );

  // SSE 스트리밍으로 체인 생성 + 실시간 UI 갱신
  const handleTopicSubmit = useCallback(
    async (topic: string) => {
      setGenerating(true);
      setGenerationStep("주제 분석 중...");

      // 빈 프로젝트 먼저 생성 (체인은 SSE로 하나씩 추가됨)
      const projectId = crypto.randomUUID();
      let targetAsset = topic;

      try {
        const res = await fetch("/api/chain/generate-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });

        if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const pendingEdges: CausalEdge[] = [];
        let projectCreated = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ") && eventType) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (eventType) {
                  case "step":
                    setGenerationStep(`Step ${data.step}: ${data.message}`);
                    break;

                  case "topic":
                    targetAsset = data.targetAsset ?? topic;
                    // 프로젝트 생성 (빈 체인으로)
                    const project: CausalProject = {
                      id: projectId,
                      title: topic,
                      targetAsset,
                      chains: [],
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    setProject(project);
                    projectCreated = true;
                    break;

                  case "news":
                    setGenerationStep(
                      data.phase === "x_to_y"
                        ? `뉴스 ${data.count}건 수집 완료 → 경제학적 분해 중...`
                        : `다양한 원인 뉴스 ${data.count}건 수집 → 시작 이벤트 추출 중...`
                    );
                    break;

                  case "start_events":
                    setGenerationStep(
                      `시작 이벤트 ${data.events.length}개 발굴: ${data.events.slice(0, 3).join(", ")}...`
                    );
                    break;

                  case "chain": {
                    // 체인 하나씩 실시간 추가
                    if (!projectCreated) {
                      const p: CausalProject = {
                        id: projectId,
                        title: topic,
                        targetAsset,
                        chains: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                      };
                      setProject(p);
                      projectCreated = true;
                    }
                    const chain = data as CausalChain;
                    addChain(chain);
                    // 이 체인의 엣지들을 추정 큐에 추가
                    pendingEdges.push(...chain.edges);
                    break;
                  }

                  case "done":
                    setGenerationStep(null);
                    toast.success(`체인 ${data.totalChains}개 생성 완료`);
                    break;

                  case "error":
                    toast.error(`생성 실패: ${data.message}`);
                    break;
                }
              } catch {
                // JSON 파싱 실패 무시
              }
              eventType = "";
            }
          }
        }

        // 체인 생성 완료 후 파라미터 자동 추정 시작
        setGenerating(false);

        if (pendingEdges.length > 0) {
          setEstimating(true);
          setGenerationStep("파라미터 자동 추정 중...");

          // 전체 병렬 추정
          await Promise.allSettled(pendingEdges.map(estimateEdge));

          setEstimating(false);
          setGenerationStep(null);
          toast.success("파라미터 자동 추정 완료");
        }
      } catch (err) {
        console.error("체인 생성 실패:", err);
        toast.error(
          err instanceof Error ? `체인 생성 실패: ${err.message}` : "체인 생성 실패"
        );
        setGenerating(false);
        setGenerationStep(null);
      }
    },
    [setProject, addChain, setGenerating, setEstimating, setGenerationStep, estimateEdge]
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
