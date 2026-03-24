import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/api/claude";
import { searchMultiQuery, newsToHintText, newsToSummaryText } from "@/lib/api/tavily";
import {
  STEP1_DECOMPOSE_SYSTEM,
  STEP2_EXTRACT_EVENTS_SYSTEM,
  STEP3_DECOMPOSE_SYSTEM,
  STEP4_VALIDATE_SYSTEM,
  PARSE_TOPIC_SYSTEM,
  buildStep1Prompt,
  buildStep2Prompt,
  buildStep3Prompt,
  buildStep4Prompt,
  buildParseTopicPrompt,
} from "@/lib/prompts/chain-generate";
import { CHAIN_COLORS } from "@/lib/types/causal";

function parseJson(text: string): Record<string, unknown> {
  let s = text;
  const m = s.match(/```json\s*([\s\S]*?)\s*```/);
  if (m) s = m[1];
  return JSON.parse(s);
}

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    // ========================================
    // Step 0: 주제에서 X, Y 추출
    // ========================================
    const parseRes = await callClaude(
      [{ role: "user", content: buildParseTopicPrompt(topic) }],
      { model: "haiku", maxTokens: 256, system: PARSE_TOPIC_SYSTEM }
    );
    const { x, y, targetAsset } = parseJson(parseRes) as {
      x: string | null;
      y: string;
      targetAsset: string;
    };

    const allChains: Record<string, unknown>[] = [];

    // ========================================
    // Step 1: X→Y 뉴스 힌트 + 경제학적 분해
    // ========================================
    if (x) {
      const step1Queries = [
        `${x} ${y} 영향`,
        `${x} 원인 ${y} 결과`,
        `${x} ${y} 전망 분석`,
      ];
      const step1News = await searchMultiQuery(step1Queries, 5);
      const hints = newsToHintText(step1News, 10);

      const step1Res = await callClaude(
        [{ role: "user", content: buildStep1Prompt(x, y, hints) }],
        { model: "sonnet", maxTokens: 4096, temperature: 0.3, system: STEP1_DECOMPOSE_SYSTEM }
      );
      const step1Data = parseJson(step1Res) as { chains: Record<string, unknown>[] };

      for (const chain of step1Data.chains ?? []) {
        allChains.push(chain);
      }
    }

    // ========================================
    // Step 2: Y 중심 다양한 시작 이벤트 발굴
    // ========================================
    const step2Queries = [
      `${y} 전망 리스크 요인`,
      `${y} 정책 규제 영향`,
      `${y} 공급망 이슈`,
      `${y} 기술 변화 동향`,
      `${y} 지정학 리스크`,
      `${y} 시장 사이클`,
    ];
    const step2News = await searchMultiQuery(step2Queries, 5);
    const summaries = newsToSummaryText(step2News, 20);

    const step2Res = await callClaude(
      [{ role: "user", content: buildStep2Prompt(y, x ?? "", summaries) }],
      { model: "haiku", maxTokens: 2048, system: STEP2_EXTRACT_EVENTS_SYSTEM }
    );
    const step2Data = parseJson(step2Res) as {
      events: { id: string; label: string; nodeLabel: string; category: string }[];
    };

    const startEvents = (step2Data.events ?? []).slice(0, 5);

    // ========================================
    // Step 3: 각 시작 이벤트→Y 경제학적 분해
    // ========================================
    const remainingSlots = 6 - allChains.length;
    const eventsToProcess = startEvents.slice(0, remainingSlots);

    const step3Results = await Promise.all(
      eventsToProcess.map(async (evt, idx) => {
        const res = await callClaude(
          [{ role: "user", content: buildStep3Prompt(evt.label, y) }],
          { model: "sonnet", maxTokens: 3072, temperature: 0.3, system: STEP3_DECOMPOSE_SYSTEM }
        );
        const data = parseJson(res) as { chains: Record<string, unknown>[] };
        const chain = (data.chains ?? [])[0];
        if (chain) {
          chain.id = `chain_${allChains.length + idx}`;
          // 시작 노드 레이블을 뉴스에서 발굴한 구체적 이벤트로 설정
          const nodes = chain.nodes as Array<Record<string, unknown>>;
          if (nodes?.[0]) {
            nodes[0].label = evt.nodeLabel || evt.label;
          }
        }
        return chain;
      })
    );

    for (const chain of step3Results) {
      if (chain) allChains.push(chain);
    }

    // ========================================
    // Step 4: 통합 검증
    // ========================================
    const chainsJson = JSON.stringify(allChains, null, 2);
    const step4Res = await callClaude(
      [{ role: "user", content: buildStep4Prompt(y, chainsJson) }],
      { model: "haiku", maxTokens: 1024, system: STEP4_VALIDATE_SYSTEM }
    );

    // 검증 결과 파싱 (에러 시 무시하고 진행)
    try {
      const validation = parseJson(step4Res) as {
        mergeNodes?: { keep: string; remove: string }[];
      };
      // 중복 노드 병합 처리
      if (validation.mergeNodes) {
        for (const merge of validation.mergeNodes) {
          for (const chain of allChains) {
            const edges = chain.edges as Array<Record<string, unknown>>;
            for (const edge of edges ?? []) {
              if (edge.from === merge.remove) edge.from = merge.keep;
              if (edge.to === merge.remove) edge.to = merge.keep;
            }
          }
        }
      }
    } catch {
      // 검증 파싱 실패 시 무시
    }

    // ========================================
    // 최종 출력: 고유 ID 보장 + 색상 할당 + paramMeta 추가
    // ========================================
    const chains = allChains.slice(0, 6).map((chain, i) => {
      const chainId = `chain_${i}`;
      const prefix = `c${i}`;

      // 노드 ID 리매핑 테이블
      const idMap = new Map<string, string>();
      const nodes = ((chain.nodes as Array<Record<string, unknown>>) ?? []).map(
        (node, ni) => {
          const oldId = node.id as string;
          const newId = `${prefix}n${ni}`;
          idMap.set(oldId, newId);
          return { ...node, id: newId, chainId };
        }
      );

      // 엣지 ID 리매핑 + from/to 업데이트
      const edges = ((chain.edges as Array<Record<string, unknown>>) ?? []).map(
        (edge, ei) => ({
          ...edge,
          id: `${prefix}e${ei}`,
          from: idMap.get(edge.from as string) ?? (edge.from as string),
          to: idMap.get(edge.to as string) ?? (edge.to as string),
          paramMeta: {},
          sources: (edge.sources as unknown[]) ?? [],
        })
      );

      return { ...chain, id: chainId, color: CHAIN_COLORS[i % CHAIN_COLORS.length], nodes, edges };
    });

    return NextResponse.json({ targetAsset: targetAsset ?? y, chains });
  } catch (err) {
    console.error("Chain generation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `체인 생성 실패: ${message}` }, { status: 500 });
  }
}
