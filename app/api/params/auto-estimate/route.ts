import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/api/claude";
import { getFredSeries } from "@/lib/api/fred";
import { searchNews } from "@/lib/api/tavily";
import {
  DATA_IDENTIFY_SYSTEM,
  USER_GUIDE_SYSTEM,
  buildDataIdentifyPrompt,
  buildUserGuidePrompt,
} from "@/lib/prompts/data-identify";
import {
  EVENT_IDENTIFY_SYSTEM,
  SIMILAR_CASES_SYSTEM,
  DECOMPOSITION_SYSTEM,
  buildEventIdentifyPrompt,
  buildSimilarCasesExtractPrompt,
  buildDecompositionPrompt,
} from "@/lib/prompts/event-to-numeric";
import {
  HISTORICAL_FREQ_SYSTEM,
  PREDICTION_MARKET_SYSTEM,
  SUPERFORECASTER_SYSTEM,
  buildHistoricalFreqPrompt,
  buildPredictionMarketPrompt,
  buildSuperforecasterPrompt,
  extremize,
} from "@/lib/prompts/event-to-event";
import {
  THRESHOLD_IDENTIFY_SYSTEM,
  buildThresholdIdentifyPrompt,
} from "@/lib/prompts/numeric-to-event";
import type { CausalEdge, Source } from "@/lib/types/causal";

const PYTHON_STATS_URL = process.env.PYTHON_STATS_URL ?? "http://localhost:8000";

function parseJson(text: string): Record<string, unknown> {
  let s = text;
  const m = s.match(/```json\s*([\s\S]*?)\s*```/);
  if (m) s = m[1];
  return JSON.parse(s);
}

// ============================================================
// Tier 1: FRED 시계열로 통계 계산
// ============================================================
async function estimateWithFred(
  xSeriesId: string,
  ySeriesId: string,
  xSourceUrl: string,
  ySourceUrl: string
) {
  const [xData, yData] = await Promise.all([
    getFredSeries(xSeriesId, "2010-01-01"),
    getFredSeries(ySeriesId, "2010-01-01"),
  ]);

  if (xData.length < 30 || yData.length < 30) return null;

  const xValues = xData.map((d) => parseFloat(d.value));
  const yValues = yData.map((d) => parseFloat(d.value));
  const minLen = Math.min(xValues.length, yValues.length);

  const res = await fetch(`${PYTHON_STATS_URL}/compute/numeric-to-numeric`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x_series: xValues.slice(0, minLen),
      y_series: yValues.slice(0, minLen),
      frequency: "monthly",
      max_lag: 24,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) return null;
  const stats = await res.json();

  return {
    params: {
      beta: stats.beta,
      r: stats.r,
      p: stats.p_value,
    },
    paramMeta: {
      beta: { status: "auto", method: `FRED OLS 회귀 (lag=${stats.optimal_lag}, n=${stats.n_obs})` },
      r: { status: "auto", method: `Pearson 상관계수 (${stats.transform})` },
      p: { status: "auto", method: `t-test p-value` },
    },
    rationale: `FRED 시계열 ${xSeriesId}↔${ySeriesId} 대상 OLS 회귀분석. 최적 시차 ${stats.optimal_lag}개월, 관측치 ${stats.n_obs}개. 변환: ${stats.transform}. Granger p=${stats.granger_p?.toFixed(4) ?? "N/A"}.`,
    confidence: stats.confidence,
    sources: [
      { label: `FRED - ${xSeriesId}`, url: xSourceUrl, type: "data" as const },
      { label: `FRED - ${ySeriesId}`, url: ySourceUrl, type: "data" as const },
    ],
  };
}

// ============================================================
// Event→Numeric 전략 2: 유사 사례 분석
// ============================================================
async function trySimilarCases(edge: CausalEdge) {
  const queries = [
    `${edge.proposition} 과거 사례 변화율`,
    `${edge.proposition} historical impact percentage`,
    `similar events ${edge.proposition} stock price change`,
  ];

  const allResults = [];
  for (const q of queries) {
    const results = await searchNews(q, 5).catch(() => []);
    allResults.push(...results);
  }

  if (allResults.length === 0) return null;

  const context = allResults
    .slice(0, 10)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content?.slice(0, 250)}\nURL: ${r.url}`)
    .join("\n\n");

  const fromLabel = edge.proposition.split("하면")[0]?.trim() ?? "";
  const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? "";

  const res = await callClaude(
    [{ role: "user", content: buildSimilarCasesExtractPrompt(fromLabel, toLabel, context) }],
    { model: "haiku", maxTokens: 1500, temperature: 0.1, system: SIMILAR_CASES_SYSTEM }
  );

  try {
    const data = parseJson(res) as {
      cases: { event: string; delta: number | null; source?: string }[];
      hasSufficientCases: boolean;
      medianDelta: number | null;
      deltaRange: [number, number] | null;
    };

    const validCases = (data.cases ?? []).filter((c) => c.delta != null);
    if (validCases.length < 3 || !data.hasSufficientCases) return null;

    const median = data.medianDelta ?? validCases[Math.floor(validCases.length / 2)].delta!;
    const sources: Source[] = validCases
      .filter((c) => c.source)
      .map((c) => ({ label: c.event, url: c.source!, type: "research" as const }));

    return {
      params: { delta: median },
      paramMeta: {
        delta: {
          status: "estimated" as const,
          method: `유사 사례 ${validCases.length}건 중앙값`,
          estimatedRange: data.deltaRange ?? undefined,
        },
      },
      rationale: `유사 사례 ${validCases.length}건 분석: ${validCases.map((c) => `${c.event}(${c.delta}%)`).join(", ")}`,
      confidence: "medium" as const,
      sources,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Event→Numeric 전략 3: LLM 4경로 분해 추정
// ============================================================
async function tryDecomposition(edge: CausalEdge) {
  const fromLabel = edge.proposition.split("하면")[0]?.trim() ?? edge.proposition;
  const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? "";

  const res = await callClaude(
    [{ role: "user", content: buildDecompositionPrompt(fromLabel, toLabel) }],
    { model: "sonnet", maxTokens: 2000, temperature: 0.2, system: DECOMPOSITION_SYSTEM }
  );

  try {
    const data = parseJson(res) as {
      direct: { delta: number; rationale: string; range?: [number, number] };
      indirect: { delta: number; rationale: string };
      psychological: { delta: number; rationale: string };
      offset: { delta: number; rationale: string };
      total_delta: number;
      total_range?: [number, number];
      confidence: string;
      sources?: Source[];
    };

    if (data.total_delta == null) return null;

    const breakdown = [
      `직접 효과: ${data.direct.delta}% (${data.direct.rationale})`,
      `간접 효과: ${data.indirect.delta}% (${data.indirect.rationale})`,
      `심리 효과: ${data.psychological.delta}% (${data.psychological.rationale})`,
      `상쇄 효과: ${data.offset.delta}% (${data.offset.rationale})`,
    ].join("\n");

    return {
      params: { delta: data.total_delta },
      paramMeta: {
        delta: {
          status: "estimated" as const,
          method: "LLM 4경로 분해 추정 (직접+간접+심리+상쇄)",
          estimatedRange: data.total_range ?? undefined,
        },
      },
      rationale: `4경로 분해 추정:\n${breakdown}\n합계: ${data.total_delta}%`,
      confidence: "low" as const,
      sources: data.sources ?? [],
    };
  } catch {
    return null;
  }
}

// ============================================================
// Event→Event: 3방법 삼각측량
// ============================================================

async function tryHistoricalFrequency(edge: CausalEdge): Promise<{ p: number; sources: Source[] } | null> {
  const fromLabel = edge.proposition.split("하면")[0]?.trim() ?? edge.from;
  const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? edge.to;

  const res = await callClaude(
    [{ role: "user", content: buildHistoricalFreqPrompt(fromLabel, toLabel) }],
    { model: "haiku", maxTokens: 1500, temperature: 0.1, system: HISTORICAL_FREQ_SYSTEM }
  );

  try {
    const data = parseJson(res) as {
      frequency: number | null;
      n_total: number;
      sufficient: boolean;
      cases: { eventA: string; source?: string }[];
    };
    if (!data.sufficient || data.frequency == null || data.n_total < 3) return null;
    const sources: Source[] = (data.cases ?? [])
      .filter((c) => c.source)
      .slice(0, 3)
      .map((c) => ({ label: c.eventA, url: c.source!, type: "research" as const }));
    return { p: data.frequency, sources };
  } catch { return null; }
}

async function tryPredictionMarket(edge: CausalEdge): Promise<{ p: number; sources: Source[] } | null> {
  const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? edge.to;
  const queries = [
    `${toLabel} prediction market probability`,
    `${toLabel} Polymarket forecast`,
    `${toLabel} Metaculus prediction`,
  ];

  const results = [];
  for (const q of queries) {
    const r = await searchNews(q, 5).catch(() => []);
    results.push(...r);
  }
  if (results.length === 0) return null;

  const context = results.slice(0, 8)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content?.slice(0, 200)}\nURL: ${r.url}`)
    .join("\n\n");

  const res = await callClaude(
    [{ role: "user", content: buildPredictionMarketPrompt(toLabel, context) }],
    { model: "haiku", maxTokens: 512, temperature: 0.1, system: PREDICTION_MARKET_SYSTEM }
  );

  try {
    const data = parseJson(res) as {
      found: boolean;
      probability: number | null;
      sourceUrl: string;
      source: string;
    };
    if (!data.found || data.probability == null) return null;
    return {
      p: data.probability,
      sources: data.sourceUrl ? [{ label: `${data.source} 예측시장`, url: data.sourceUrl, type: "data" as const }] : [],
    };
  } catch { return null; }
}

async function trySuperforecaster(edge: CausalEdge) {
  const fromLabel = edge.proposition.split("하면")[0]?.trim() ?? edge.from;
  const toLabel = edge.proposition.split("하면")[1]?.split("한다")[0]?.trim() ?? edge.to;

  const res = await callClaude(
    [{ role: "user", content: buildSuperforecasterPrompt(fromLabel, toLabel, edge.proposition) }],
    { model: "sonnet", maxTokens: 3000, temperature: 0.3, system: SUPERFORECASTER_SYSTEM }
  );

  try {
    const data = parseJson(res) as {
      outside_view: { base_rate: number; cases: string[]; reasoning: string };
      inside_view: { adjusted_probability: number; upward_factors: string[]; downward_factors: string[]; reasoning: string };
      red_team: { challenged_probability: number; overestimate_reasons: string[]; underestimate_reasons: string[]; reasoning: string };
      final: { probability: number; range: [number, number]; confidence: string };
      sources: Source[];
    };

    const rationale = [
      `[외부 관점] 기저율: ${data.outside_view.base_rate} — ${data.outside_view.reasoning}`,
      `[내부 관점] 조정: ${data.inside_view.adjusted_probability} — 상승 요인: ${data.inside_view.upward_factors.join(", ")} / 하락 요인: ${data.inside_view.downward_factors.join(", ")}`,
      `[반대 관점] 재조정: ${data.red_team.challenged_probability} — 과대: ${data.red_team.overestimate_reasons.join(", ")} / 과소: ${data.red_team.underestimate_reasons.join(", ")}`,
      `[최종] P = ${data.final.probability} (범위: ${data.final.range.join("~")})`,
    ].join("\n");

    return {
      p: data.final.probability,
      range: data.final.range,
      confidence: data.final.confidence,
      rationale,
      sources: data.sources ?? [],
    };
  } catch { return null; }
}

async function estimateEventToEvent(edge: CausalEdge) {
  const probabilities: number[] = [];
  const allSources: Source[] = [];
  const methodsUsed: string[] = [];
  let rationale = "";

  // 방법 1: 역사적 빈도
  const histResult = await tryHistoricalFrequency(edge);
  if (histResult) {
    probabilities.push(histResult.p);
    allSources.push(...histResult.sources);
    methodsUsed.push(`역사적 빈도: ${histResult.p}`);
  }

  // 방법 2: 예측 시장
  const marketResult = await tryPredictionMarket(edge);
  if (marketResult) {
    probabilities.push(marketResult.p);
    allSources.push(...marketResult.sources);
    methodsUsed.push(`예측시장: ${marketResult.p}`);
  }

  // 방법 3: Superforecaster (항상 실행)
  const sfResult = await trySuperforecaster(edge);
  if (sfResult) {
    probabilities.push(sfResult.p);
    allSources.push(...sfResult.sources);
    methodsUsed.push(`Superforecaster: ${sfResult.p}`);
    rationale = sfResult.rationale;
  }

  if (probabilities.length === 0) return null;

  // 극단화 평균
  const finalP = probabilities.length >= 2
    ? extremize(probabilities, 2.5)
    : probabilities[0];

  // 신뢰도
  let confidence: "high" | "medium" | "low" = "low";
  if (probabilities.length >= 3) {
    const spread = Math.max(...probabilities) - Math.min(...probabilities);
    confidence = spread < 0.1 ? "high" : spread < 0.2 ? "medium" : "low";
  } else if (probabilities.length === 2) {
    confidence = "medium";
  }

  const methodSummary = `삼각측량 (${methodsUsed.join(" / ")}) → 극단화 평균: ${finalP}`;

  return {
    params: { probability: finalP },
    paramMeta: {
      probability: {
        status: "estimated" as const,
        method: methodSummary,
        estimatedRange: sfResult?.range ?? undefined,
      },
    },
    rationale: `${methodSummary}\n\n${rationale}`,
    confidence,
    sources: allSources,
  };
}

// ============================================================
// Tier 2/3: 웹 검색으로 수치 추출
// ============================================================
async function estimateWithWebSearch(
  edge: CausalEdge,
  searchQuery: string
) {
  const results = await searchNews(searchQuery, 8);
  if (results.length === 0) return null;

  const context = results
    .slice(0, 5)
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content?.slice(0, 300)}\nURL: ${r.url}`)
    .join("\n\n");

  const extractPrompt = `아래 검색 결과에서 "${edge.proposition}"에 대한 구체적인 수치를 추출하세요.

## 검색 결과
${context}

## 추출 규칙
1. 구체적 숫자(%, 배수, 금액 등)가 있으면 추출
2. edgeType "${edge.edgeType}"에 맞는 파라미터로 변환:
   - event-numeric: delta (변화량 %)
   - numeric-numeric: beta (기울기), r (상관계수)
   - event-event: probability (0~1)
3. 수치를 찾지 못하면 null
4. 출처 URL을 반드시 포함

JSON 출력: { "params": {...}, "rationale": "...", "sourceUrl": "...", "sourceName": "...", "found": true|false }`;

  const res = await callClaude(
    [{ role: "user", content: extractPrompt }],
    { model: "haiku", maxTokens: 1024, temperature: 0.1 }
  );

  try {
    const data = parseJson(res) as {
      params: Record<string, number | null>;
      rationale: string;
      sourceUrl: string;
      sourceName: string;
      found: boolean;
    };
    if (!data.found || !data.params) return null;

    return {
      params: data.params,
      paramMeta: Object.fromEntries(
        Object.keys(data.params ?? {}).map((k) => [
          k,
          { status: "estimated" as const, method: `웹 검색 수치 추출 (${data.sourceName ?? "web"})` },
        ])
      ),
      rationale: data.rationale,
      confidence: "medium" as const,
      sources: data.sourceUrl
        ? [{ label: data.sourceName, url: data.sourceUrl, type: "research" as const }]
        : [],
    };
  } catch {
    return null;
  }
}

// ============================================================
// Fallback: LLM 추정 (근거 있으면 값, 없으면 null + 가이드)
// ============================================================
async function estimateWithLlmFallback(edge: CausalEdge) {
  // 엣지 타입에 따라 필요한 파라미터 키 명시
  const paramGuide: Record<string, string> = {
    "numeric-numeric": '필요 파라미터: beta(회귀 기울기, X 1단위 변화 시 Y 변화량), r(상관계수 -1~1), p(p-value 0~1)\n출력: { "params": { "beta": number|null, "r": number|null, "p": number|null }, ... }',
    "event-numeric": '필요 파라미터: delta(변화량 %)\n출력: { "params": { "delta": number|null }, ... }',
    "event-event": '필요 파라미터: probability(조건부 확률 0~1)\n출력: { "params": { "probability": number|null }, ... }',
    "numeric-event": '필요 파라미터: theta(임계값)\n출력: { "params": { "theta": number|null }, ... }',
  };

  const estimatePrompt = `다음 인과 명제의 파라미터를 추정하세요.

명제: ${edge.proposition}
타입: ${edge.edgeType}
근거: ${edge.rationale}

## ${paramGuide[edge.edgeType] ?? ""}

## 규칙
1. 경제학 연구, 실증 분석, 업계 통계 등의 근거가 있으면 구체적 수치를 제시
2. 근거를 찾을 수 없으면 반드시 null (절대 지어내지 마세요)
3. null인 경우 대략적인 추정 범위(estimatedRange)만 제시
4. numeric-numeric의 경우: beta, r, p를 모두 추정 시도. beta만이라도 추정 가능하면 제시
5. 근거 자료 URL은 실제 존재하는 것만

JSON 출력: { "params": { ... }, "hasEvidence": true|false, "rationale": "...", "estimatedRange": [low, high]|null, "sources": [{ "label": "...", "url": "...", "type": "research" }] }`;

  const res = await callClaude(
    [{ role: "user", content: estimatePrompt }],
    { model: "sonnet", maxTokens: 1500, temperature: 0.2 }
  );

  const data = parseJson(res) as {
    params: Record<string, number | null> | null;
    hasEvidence: boolean;
    rationale: string;
    estimatedRange: [number, number] | null;
    sources: Source[];
  };

  const params = data.params ?? {};

  if (data.hasEvidence && Object.values(params).some((v) => v != null)) {
    return {
      params,
      paramMeta: Object.fromEntries(
        Object.keys(params).map((k) => [
          k,
          {
            status: params[k] != null ? ("estimated" as const) : ("pending" as const),
            method: params[k] != null ? "LLM 근거 기반 추정" : "추정 불가",
            estimatedRange: data.estimatedRange ?? undefined,
          },
        ])
      ),
      rationale: data.rationale,
      confidence: "low" as const,
      sources: data.sources ?? [],
      userGuide: null,
    };
  }

  // 근거 없음 → null + 사용자 가이드 생성
  const fromLabel = edge.proposition.split("→")[0]?.split("하면")[0]?.trim() ?? edge.from;
  const toLabel = edge.proposition.split("→")[1]?.trim() ?? edge.to;

  const guideRes = await callClaude(
    [{ role: "user", content: buildUserGuidePrompt(edge.edgeType, edge.proposition, fromLabel, toLabel) }],
    { model: "haiku", maxTokens: 512, temperature: 0.2, system: USER_GUIDE_SYSTEM }
  );

  let userGuide = null;
  try {
    userGuide = parseJson(guideRes);
  } catch { /* ignore */ }

  return {
    params, // 전부 null
    paramMeta: Object.fromEntries(
      Object.keys(params).map((k) => [
        k,
        {
          status: "pending" as const,
          method: "자동 추정 실패 — 사용자 입력 필요",
          estimatedRange: (userGuide as Record<string, unknown>)?.estimatedRange as [number, number] | undefined,
        },
      ])
    ),
    rationale: "FRED/DART/웹 검색 모두에서 직접적인 근거를 찾지 못했습니다. 아래 가이드를 참고하여 직접 입력해주세요.",
    confidence: "low" as const,
    sources: [],
    userGuide,
  };
}

// ============================================================
// 메인 핸들러
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { edge } = (await req.json()) as { edge: CausalEdge };
    if (!edge) {
      return NextResponse.json({ error: "edge is required" }, { status: 400 });
    }

    // Step 1: Haiku로 데이터 소스 식별
    const fromLabel = edge.proposition.split("→")[0]?.trim() ?? edge.from;
    const toLabel = edge.proposition.split("→")[1]?.trim() ?? edge.to;

    let sourceInfo: Record<string, unknown> | null = null;
    try {
      const identifyRes = await callClaude(
        [{ role: "user", content: buildDataIdentifyPrompt(fromLabel, toLabel, edge.edgeType, edge.proposition) }],
        { model: "haiku", maxTokens: 1024, temperature: 0.1, system: DATA_IDENTIFY_SYSTEM }
      );
      sourceInfo = parseJson(identifyRes);
    } catch {
      // 소스 식별 실패 → fallback으로 진행
    }

    const xSource = sourceInfo?.x_source as Record<string, unknown> | undefined;
    const ySource = sourceInfo?.y_source as Record<string, unknown> | undefined;
    const xTier = (xSource?.tier as number) ?? 99;
    const yTier = (ySource?.tier as number) ?? 99;

    // Step 2: 엣지 타입별 분기

    // ======== numeric-numeric ========
    if (edge.edgeType === "numeric-numeric") {
      // Tier 1: FRED 시계열 통계
      if (xTier === 1 && yTier === 1 && xSource?.type === "fred" && ySource?.type === "fred") {
        const result = await estimateWithFred(
          xSource.seriesId as string,
          ySource.seriesId as string,
          (xSource.sourceUrl as string) ?? "",
          (ySource.sourceUrl as string) ?? ""
        );
        if (result) return NextResponse.json(result);
      }

      // Tier 2/3: 웹 검색 수치 추출
      const searchQuery = (sourceInfo?.searchQuery as string) ?? `${fromLabel} ${toLabel} 상관관계 데이터`;
      const webResult = await estimateWithWebSearch(edge, searchQuery);
      if (webResult) return NextResponse.json(webResult);

      // Fallback: LLM 추정
      const fallback = await estimateWithLlmFallback(edge);
      return NextResponse.json(fallback);
    }

    // ======== event-numeric: 3전략 파이프라인 ========
    if (edge.edgeType === "event-numeric") {
      // 전략 1: Event Study (TODO: Finnhub 데이터 연동 후 활성화)
      // 현재는 전략 2부터 시작

      // 전략 2: 유사 사례 분석
      const similarResult = await trySimilarCases(edge);
      if (similarResult) return NextResponse.json(similarResult);

      // 전략 3: LLM 4경로 분해 추정
      const decompResult = await tryDecomposition(edge);
      if (decompResult) return NextResponse.json(decompResult);

      // 전부 실패: null + 가이드
      const fallback = await estimateWithLlmFallback(edge);
      return NextResponse.json(fallback);
    }

    // ======== event-event: 3방법 삼각측량 ========
    if (edge.edgeType === "event-event") {
      const eeResult = await estimateEventToEvent(edge);
      if (eeResult) return NextResponse.json(eeResult);

      // 전부 실패: null + 가이드
      const fallback = await estimateWithLlmFallback(edge);
      return NextResponse.json(fallback);
    }

    // ======== numeric-event: 3경로 임계값 추정 ========
    if (edge.edgeType === "numeric-event") {
      // 경로 1+3: LLM 임계값 조회 (규제 → 공식 목표 → 시장 관행)
      try {
        const thresholdRes = await callClaude(
          [{ role: "user", content: buildThresholdIdentifyPrompt(fromLabel, toLabel, edge.proposition) }],
          { model: "haiku", maxTokens: 1024, temperature: 0.1, system: THRESHOLD_IDENTIFY_SYSTEM }
        );
        const tData = parseJson(thresholdRes) as {
          found: boolean;
          theta: number | null;
          threshold_type: string;
          k: number;
          basis: string;
          category: string;
          sourceUrl: string | null;
          sourceName: string | null;
          confidence: string;
          estimatedRange?: [number, number];
        };

        if (tData.found && tData.theta != null) {
          return NextResponse.json({
            params: { theta: tData.theta },
            paramMeta: {
              theta: {
                status: "auto" as const,
                method: `${tData.category === "regulatory" ? "규제 기준" : tData.category === "official_target" ? "공식 목표" : "시장 관행"} (${tData.basis})`,
              },
            },
            rationale: `${tData.basis}. θ=${tData.theta}, 유형=${tData.threshold_type}, 민감도 k=${tData.k}`,
            confidence: tData.confidence ?? "medium",
            threshold_type: tData.threshold_type,
            k: tData.k,
            sources: tData.sourceUrl
              ? [{ label: tData.sourceName ?? tData.basis, url: tData.sourceUrl, type: "official" as const }]
              : [],
          });
        }

        // 찾지 못했으나 추정범위는 있는 경우
        if (tData.estimatedRange) {
          return NextResponse.json({
            params: { theta: null },
            paramMeta: {
              theta: {
                status: "pending" as const,
                method: "공식 임계값 미발견 — 추정 범위만 제시",
                estimatedRange: tData.estimatedRange,
              },
            },
            rationale: "법적/규제적/관행적 임계값을 확인하지 못했습니다. 추정 범위를 참고하여 직접 입력해주세요.",
            confidence: "low",
            sources: [],
          });
        }
      } catch {
        // LLM 조회 실패 → fallback
      }

      // 최종 fallback
      const fallback = await estimateWithLlmFallback(edge);
      return NextResponse.json(fallback);
    }

    // ======== 기타 edgeType ========
    const searchQuery = (sourceInfo?.searchQuery as string) ?? `${fromLabel} ${toLabel} 영향 데이터`;
    const webResult = await estimateWithWebSearch(edge, searchQuery);
    if (webResult) return NextResponse.json(webResult);

    const fallbackResult = await estimateWithLlmFallback(edge);
    return NextResponse.json(fallbackResult);
  } catch (err) {
    console.error("Auto-estimate failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `자동 추정 실패: ${message}` }, { status: 500 });
  }
}
