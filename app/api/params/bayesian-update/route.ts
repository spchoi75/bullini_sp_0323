import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/api/claude";
import { searchNews } from "@/lib/api/tavily";
import {
  LIKELIHOOD_RATIO_SYSTEM,
  buildLikelihoodPrompt,
  sequentialBayesianUpdate,
} from "@/lib/prompts/bayesian-update";

function parseJson(text: string): Record<string, unknown> {
  let s = text;
  const m = s.match(/```json\s*([\s\S]*?)\s*```/);
  if (m) s = m[1];
  return JSON.parse(s);
}

export async function POST(req: NextRequest) {
  try {
    const { eventA, eventB, currentProbability, manualEvidence } = await req.json();

    if (!eventA || !eventB || currentProbability == null) {
      return NextResponse.json({ error: "eventA, eventB, currentProbability required" }, { status: 400 });
    }

    // Step 1: 관련 뉴스 수집 (최근 뉴스 또는 사용자 입력)
    let evidences: { text: string; source?: string }[] = [];

    if (manualEvidence) {
      evidences = [{ text: manualEvidence }];
    } else {
      const results = await searchNews(`${eventA} ${eventB} 최근`, 8);
      evidences = results.slice(0, 5).map((r) => ({
        text: `${r.title}: ${r.content?.slice(0, 200)}`,
        source: r.url,
      }));
    }

    if (evidences.length === 0) {
      return NextResponse.json({
        updated: false,
        reason: "관련 최근 뉴스를 찾지 못했습니다",
        prior: currentProbability,
        posterior: currentProbability,
      });
    }

    // Step 2: 각 뉴스의 우도비 추정
    const lrResults: { lr: number; reasoning: string; evidence: string; source?: string }[] = [];

    for (const ev of evidences) {
      try {
        const res = await callClaude(
          [{ role: "user", content: buildLikelihoodPrompt(eventA, eventB, currentProbability, ev.text) }],
          { model: "haiku", maxTokens: 512, temperature: 0.1, system: LIKELIHOOD_RATIO_SYSTEM }
        );
        const data = parseJson(res) as { lr: number; reasoning: string };
        if (data.lr && data.lr > 0) {
          lrResults.push({ lr: data.lr, reasoning: data.reasoning, evidence: ev.text, source: ev.source });
        }
      } catch {
        // 개별 뉴스 LR 추정 실패 → skip
      }
    }

    if (lrResults.length === 0) {
      return NextResponse.json({
        updated: false,
        reason: "우도비를 추정하지 못했습니다",
        prior: currentProbability,
        posterior: currentProbability,
      });
    }

    // Step 3: 순차 베이지안 업데이트
    const lrs = lrResults.map((r) => r.lr);
    const posterior = sequentialBayesianUpdate(currentProbability, lrs);
    const delta = Math.abs(posterior - currentProbability);

    return NextResponse.json({
      updated: true,
      prior: currentProbability,
      posterior,
      delta,
      needsConfirmation: delta > 0.15,
      evidences: lrResults.map((r) => ({
        evidence: r.evidence.slice(0, 100),
        lr: r.lr,
        reasoning: r.reasoning,
        source: r.source,
      })),
    });
  } catch (err) {
    console.error("Bayesian update failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `베이지안 업데이트 실패: ${message}` }, { status: 500 });
  }
}
