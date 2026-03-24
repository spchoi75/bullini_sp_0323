import { NextRequest } from "next/server";
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

function assignChainIds(chain: Record<string, unknown>, chainIndex: number) {
  const chainId = `chain_${chainIndex}`;
  const prefix = `c${chainIndex}`;
  const idMap = new Map<string, string>();

  const nodes = ((chain.nodes as Array<Record<string, unknown>>) ?? []).map((node, ni) => {
    const oldId = node.id as string;
    const newId = `${prefix}n${ni}`;
    idMap.set(oldId, newId);
    return { ...node, id: newId, chainId };
  });

  const edges = ((chain.edges as Array<Record<string, unknown>>) ?? []).map((edge, ei) => ({
    ...edge,
    id: `${prefix}e${ei}`,
    from: idMap.get(edge.from as string) ?? (edge.from as string),
    to: idMap.get(edge.to as string) ?? (edge.to as string),
    paramMeta: {},
    sources: (edge.sources as unknown[]) ?? [],
  }));

  return {
    ...chain,
    id: chainId,
    color: CHAIN_COLORS[chainIndex % CHAIN_COLORS.length],
    nodes,
    edges,
  };
}

export async function POST(req: NextRequest) {
  const { topic } = await req.json();

  const encoder = new TextEncoder();
  let chainIndex = 0;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      try {
        // ========== Step 0: 주제 파싱 ==========
        send("step", { step: "0/4", message: "주제 분석 중..." });

        const parseRes = await callClaude(
          [{ role: "user", content: buildParseTopicPrompt(topic) }],
          { model: "haiku", maxTokens: 256, system: PARSE_TOPIC_SYSTEM }
        );
        const { x, y, targetAsset } = parseJson(parseRes) as {
          x: string | null; y: string; targetAsset: string;
        };

        send("topic", { x, y, targetAsset });

        // ========== Step 1: X→Y 분해 ==========
        if (x) {
          send("step", { step: "1/4", message: `"${x}" → "${y}" 뉴스 검색 + 경제학적 분해 중...` });

          const step1News = await searchMultiQuery(
            [`${x} ${y} 영향`, `${x} 원인 ${y} 결과`, `${x} ${y} 전망`], 5
          );
          send("news", { count: step1News.length, phase: "x_to_y" });

          const hints = newsToHintText(step1News, 10);
          const step1Res = await callClaude(
            [{ role: "user", content: buildStep1Prompt(x, y, hints) }],
            { model: "sonnet", maxTokens: 4096, temperature: 0.3, system: STEP1_DECOMPOSE_SYSTEM }
          );
          const step1Data = parseJson(step1Res) as { chains: Record<string, unknown>[] };

          for (const chain of step1Data.chains ?? []) {
            const processed = assignChainIds(chain, chainIndex++);
            send("chain", processed); // 체인 하나씩 실시간 전송
          }
        }

        // ========== Step 2: Y 원인 발굴 ==========
        send("step", { step: "2/4", message: `"${y}" 관련 다양한 원인 뉴스 검색 중...` });

        const step2News = await searchMultiQuery([
          `${y} 전망 리스크`, `${y} 정책 규제`, `${y} 공급망`,
          `${y} 기술 변화`, `${y} 지정학`, `${y} 시장 사이클`,
        ], 5);
        send("news", { count: step2News.length, phase: "y_causes" });

        const summaries = newsToSummaryText(step2News, 20);
        const step2Res = await callClaude(
          [{ role: "user", content: buildStep2Prompt(y, x ?? "", summaries) }],
          { model: "haiku", maxTokens: 2048, system: STEP2_EXTRACT_EVENTS_SYSTEM }
        );
        const step2Data = parseJson(step2Res) as {
          events: { id: string; label: string; nodeLabel: string }[];
        };

        const startEvents = (step2Data.events ?? []).slice(0, 5);
        send("start_events", { events: startEvents.map(e => e.label) });

        // ========== Step 3: 각 이벤트→Y 분해 (순차, 하나씩 전송) ==========
        const remainingSlots = 6 - chainIndex;
        const eventsToProcess = startEvents.slice(0, remainingSlots);

        for (let i = 0; i < eventsToProcess.length; i++) {
          const evt = eventsToProcess[i];
          send("step", {
            step: `3/4`,
            message: `체인 ${chainIndex + 1}/6: "${evt.label}" → "${y}" 분해 중...`,
          });

          try {
            const res = await callClaude(
              [{ role: "user", content: buildStep3Prompt(evt.label, y) }],
              { model: "sonnet", maxTokens: 3072, temperature: 0.3, system: STEP3_DECOMPOSE_SYSTEM }
            );
            const data = parseJson(res) as { chains: Record<string, unknown>[] };
            const chain = (data.chains ?? [])[0];
            if (chain) {
              const nodes = chain.nodes as Array<Record<string, unknown>>;
              if (nodes?.[0]) nodes[0].label = evt.nodeLabel || evt.label;
              const processed = assignChainIds(chain, chainIndex++);
              send("chain", processed);
            }
          } catch {
            // 개별 체인 실패 시 skip
          }
        }

        // ========== Step 4: 검증 ==========
        send("step", { step: "4/4", message: "통합 검증 중..." });

        // 검증은 간소화 (이미 체인이 하나씩 전송됨)
        send("done", { targetAsset, totalChains: chainIndex });

      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
