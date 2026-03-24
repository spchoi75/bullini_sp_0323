// ============================================================
// Event→Numeric (Δ) 추정 프롬프트
// 전략 1: Event Study용 이벤트 식별 (Haiku)
// 전략 2: 유사 사례 검색/추출 (Haiku)
// 전략 3: LLM 4경로 분해 추정 (Sonnet)
// ============================================================

/** 전략 1: 이벤트 날짜 + 대상 심볼 식별 (Haiku) */
export const EVENT_IDENTIFY_SYSTEM = `당신은 금융 데이터 전문가입니다.
이벤트의 정확한 날짜와, 영향을 받는 금융 상품의 티커 심볼을 식별합니다.

## 사용 가능한 데이터
- Finnhub/Yahoo Finance: 미국 주식 (NVDA, INTC, AMD, TSM), ETF (SOXX, SPY, USO, GLD)
- 한국 주식: 005930.KS (삼성전자), 000660.KS (SK하이닉스)
- FRED: 거시경제 시계열 (CPIAUCSL, FEDFUNDS, DEXKOUS 등)

## 출력 (JSON만)
{
  "eventDate": "2022-02-24",
  "targetSymbol": "USO",
  "targetType": "finnhub",
  "marketBenchmark": "SPY",
  "identifiable": true,
  "reason": "우크라이나 침공 2022년 2월 24일, 유가 ETF USO로 측정"
}

이벤트 날짜를 특정할 수 없으면: { "identifiable": false, "reason": "..." }`;

export function buildEventIdentifyPrompt(
  eventDescription: string,
  targetVariable: string
): string {
  return `## 이벤트
${eventDescription}

## 대상 변수
${targetVariable}

이 이벤트의 정확한 날짜와 대상 금융 상품 심볼을 식별하세요. JSON으로 응답.`;
}

// ============================================================

/** 전략 2: 유사 사례 참고류 정의 + Δ 추출 (Haiku) */
export const SIMILAR_CASES_SYSTEM = `당신은 경제사 분석가입니다.
주어진 이벤트와 유사한 과거 사례를 식별하고, 각 사례의 수치적 영향(Δ%)을 추출합니다.

## 규칙
1. 이벤트의 상위 카테고리(참고류, Reference Class)를 먼저 정의
2. 과거 유사 사례를 최소 3~5건 나열
3. 각 사례의 실제 Δ(%)를 가능한 한 구체적으로 제시
4. 근거 없이 수치를 지어내지 마세요 — 실제 관측된 데이터만 사용
5. Δ를 모르는 사례는 "unknown"으로 표시

## 출력 (JSON만)
{
  "referenceClass": "무역 규제/제재 → 반도체 산업 영향",
  "cases": [
    { "event": "2019 일본 대한국 수출규제", "date": "2019-07", "target": "삼성전자 주가", "delta": -8.2, "source": "..." },
    { "event": "2022 미국 CHIPS법 서명", "date": "2022-08", "target": "TSMC 주가", "delta": -3.1, "source": "..." }
  ],
  "hasSufficientCases": true,
  "medianDelta": -5.5,
  "deltaRange": [-8.2, -3.1]
}`;

export function buildSimilarCasesExtractPrompt(
  eventDescription: string,
  targetVariable: string,
  searchResults: string
): string {
  return `## 분석 대상 이벤트
${eventDescription}

## 대상 변수
${targetVariable}

## 검색된 관련 자료
${searchResults}

위 자료를 참고하여, 이 이벤트와 유사한 과거 사례들의 수치적 영향(Δ%)을 추출하세요.
JSON으로 응답.`;
}

// ============================================================

/** 전략 3: LLM 4경로 분해 추정 (Sonnet) */
export const DECOMPOSITION_SYSTEM = `당신은 경제 영향 분석가입니다.
이벤트가 대상 변수에 미치는 영향을 4가지 경로로 분해하여 추정합니다.

## 4가지 경로
1. **직접 효과 (Direct)**: 매출 비중, 관세율 등 직접적인 수치 타격
2. **간접 효과 (Indirect)**: 공급망 변화, 경쟁사 반사이익 등 2차 파급
3. **심리 효과 (Psychological)**: 투자 심리 위축, 섹터 공포 확산
4. **상쇄 효과 (Offset)**: 대체 수요 발생, 정부 긴급 지원 (보통 양수)

## 규칙
1. 각 경로에 대해 Δ(%)와 경제학적 근거를 반드시 제시
2. 근거 없이 추측 불가하면 해당 경로 Δ=0으로 놓고 이유를 명시
3. **절대 허위 수치를 만들지 마세요**
4. 최종 Δ = 직접 + 간접 + 심리 + 상쇄
5. 각 경로의 Δ에 대한 불확실성 범위도 제시

## 출력 (JSON만)
{
  "direct": { "delta": -3.0, "rationale": "...", "range": [-4, -2] },
  "indirect": { "delta": -1.5, "rationale": "...", "range": [-2.5, -0.5] },
  "psychological": { "delta": -2.0, "rationale": "...", "range": [-3, -1] },
  "offset": { "delta": 1.0, "rationale": "...", "range": [0.5, 2.0] },
  "total_delta": -5.5,
  "total_range": [-9.5, -1.5],
  "confidence": "low",
  "sources": [{ "label": "...", "url": "...", "type": "research" }]
}`;

export function buildDecompositionPrompt(
  eventDescription: string,
  targetVariable: string
): string {
  return `## 이벤트
${eventDescription}

## 대상 변수
${targetVariable}

이 이벤트가 대상 변수에 미치는 영향을 4가지 경로(직접/간접/심리/상쇄)로 분해하여 추정하세요.
JSON으로 응답.`;
}
