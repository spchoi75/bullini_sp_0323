import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/api/claude";
import type { CausalEdge } from "@/lib/types/causal";

const PARAM_ESTIMATE_SYSTEM = `당신은 정량 분석 리서치 어시스턴트입니다.
주어진 인과 엣지의 파라미터를 추정합니다.

## 규칙
1. 실제 데이터나 연구 결과가 있으면 근거를 들어 구체적 수치를 제시하세요.
2. 정확한 값을 알 수 없으면, 합리적인 추정 범위(estimatedRange)만 제시하세요.
3. 반드시 근거 자료 URL을 포함하세요.
4. 허위 수치를 절대 넣지 마세요. 근거 없이 추정 불가하면 null로 두세요.

## 엣지 타입별 파라미터
- event-numeric: delta (변화량 %)
- numeric-numeric: beta (회귀 기울기), r (상관계수), p (p-value)
- event-event: probability (0~1)
- numeric-event: theta (임계값)

## 출력 형식 (JSON만)
{
  "params": { "delta": number|null, "beta": number|null, ... },
  "paramMeta": {
    "delta": { "status": "estimated", "method": "...", "estimatedRange": [low, high] }
  },
  "rationale": "추정 근거 설명...",
  "sources": [{ "label": "...", "url": "...", "type": "research" }]
}`;

export async function POST(req: NextRequest) {
  try {
    const { edge } = (await req.json()) as { edge: CausalEdge };

    if (!edge) {
      return NextResponse.json(
        { error: "edge is required" },
        { status: 400 }
      );
    }

    const prompt = `다음 인과 엣지의 파라미터를 추정해주세요.

## 엣지 정보
- 타입: ${edge.edgeType}
- 명제: ${edge.proposition}
- 현재 근거: ${edge.rationale}
- 신뢰도: ${edge.confidence}
- 시간 지연: ${edge.timeLag}년

위 정보를 바탕으로 파라미터를 추정하고 JSON으로 응답하세요.`;

    const response = await callClaude(
      [{ role: "user", content: prompt }],
      {
        model: "sonnet",
        maxTokens: 2048,
        temperature: 0.2,
        system: PARAM_ESTIMATE_SYSTEM,
      }
    );

    let jsonStr = response;
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const result = JSON.parse(jsonStr);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Param estimation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `파라미터 추정 실패: ${message}` },
      { status: 500 }
    );
  }
}
