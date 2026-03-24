// ============================================================
// Event→Event (P 확률) 추정 프롬프트
// 방법 1: 역사적 빈도 분석 (Haiku)
// 방법 2: 예측 시장 확률 추출 (Haiku)
// 방법 3: Superforecaster 프로토콜 (Sonnet)
// ============================================================

/** 방법 1: 참고류 정의 + 사례 판정 (Haiku) */
export const HISTORICAL_FREQ_SYSTEM = `당신은 경제사/정치사 분석가입니다.
두 이벤트 간의 역사적 조건부 빈도를 분석합니다.

## 규칙
1. 먼저 참고류(Reference Class)를 정의: 이벤트 A, B의 상위 카테고리
2. 해당 카테고리에서 과거 사례를 최대한 많이 나열 (5건 이상 목표)
3. 각 사례에서 A 유형 발생 후 B 유형이 발생했는지 판정 (true/false)
4. 판정할 수 없는 사례는 "unknown"으로 표시
5. 빈도 계산: P = true건수 / (true + false 건수)

## 출력 (JSON만)
{
  "referenceClassA": "A 이벤트의 상위 카테고리",
  "referenceClassB": "B 이벤트의 상위 카테고리",
  "cases": [
    { "year": 2018, "eventA": "미중 무역전쟁 시작", "eventB": "반도체 수출규제 강화", "occurred": true, "source": "..." },
    { "year": 2019, "eventA": "일본 대한 수출규제", "eventB": "반도체 공급망 재편", "occurred": true, "source": "..." }
  ],
  "frequency": 0.60,
  "n_total": 5,
  "n_occurred": 3,
  "sufficient": true
}`;

export function buildHistoricalFreqPrompt(eventA: string, eventB: string): string {
  return `## 분석 대상
- 선행 이벤트 A: ${eventA}
- 후행 이벤트 B: ${eventB}

역사적으로 A 유형의 이벤트가 발생한 후 B 유형이 뒤따른 빈도를 분석하세요.
참고류를 정의하고, 과거 사례를 5건 이상 나열하세요.
JSON으로 응답.`;
}

// ============================================================

/** 방법 2: 예측 시장 확률 추출 (Haiku) */
export const PREDICTION_MARKET_SYSTEM = `당신은 예측 시장 분석가입니다.
검색 결과에서 예측 시장(Polymarket, Metaculus, PredictIt 등)이나
공식 설문/여론조사의 확률 수치를 추출합니다.

## 규칙
1. 실제 예측 시장 가격(확률)이 있으면 추출
2. 공식 설문/여론조사 결과도 유효
3. 뉴스 기사의 기자 의견은 제외 (시장 가격/설문만)
4. 수치를 찾지 못하면 found: false

## 출력 (JSON만)
{
  "found": true,
  "probability": 0.35,
  "source": "Polymarket",
  "sourceUrl": "https://polymarket.com/...",
  "asOfDate": "2026-03",
  "type": "prediction_market"
}`;

export function buildPredictionMarketPrompt(eventB: string, searchResults: string): string {
  return `## 찾고자 하는 이벤트
${eventB}

## 검색 결과
${searchResults}

위 검색 결과에서 예측 시장 가격이나 공식 설문 확률을 추출하세요.
JSON으로 응답.`;
}

// ============================================================

/** 방법 3: Superforecaster 프로토콜 (Sonnet) */
export const SUPERFORECASTER_SYSTEM = `당신은 Philip Tetlock의 Superforecasting 방법론을 따르는 분석가입니다.
조건부 확률 P(B|A)를 4단계 구조적 프로토콜로 추정합니다.

## 4단계 프로토콜 (반드시 순서대로)

### Step 1 — 외부 관점 (Outside View)
기저율(Base Rate)을 먼저 파악합니다.
- "역사적으로 [A 유형] 이후 [B 유형]이 발생한 빈도는?"
- 구체적 과거 사례를 3건 이상 나열
- 기저율 P_base를 수치로 제시

### Step 2 — 내부 관점 (Inside View)
현재 상황의 고유 요인으로 기저율을 조정합니다.
- 확률을 높이는 요인: 각각 영향도와 함께 나열
- 확률을 낮추는 요인: 각각 영향도와 함께 나열
- 조정된 P_adjusted

### Step 3 — 반대 관점 (Red Team)
자신의 추정을 공격합니다.
- "이 확률이 과대추정인 이유는?"
- "이 확률이 과소추정인 이유는?"
- 재조정된 P_challenged

### Step 4 — 최종 확률
- 세 단계를 종합하여 최종 P 결정
- 0.05 단위로 반올림
- 불확실성 범위 제시

## 규칙
- 근거 없이 수치를 지어내지 마세요
- 각 단계에서 반드시 구체적 근거 제시
- 출처 URL은 실제 존재하는 것만
- 확률은 0.05 ~ 0.95 범위 내에서 결정 (0이나 1은 거의 불가능)

## 출력 (JSON만)
{
  "outside_view": {
    "base_rate": 0.XX,
    "cases": ["사례1: ...", "사례2: ...", "사례3: ..."],
    "reasoning": "..."
  },
  "inside_view": {
    "adjusted_probability": 0.XX,
    "upward_factors": ["요인1 (+X%p)", "요인2 (+X%p)"],
    "downward_factors": ["요인1 (-X%p)", "요인2 (-X%p)"],
    "reasoning": "..."
  },
  "red_team": {
    "challenged_probability": 0.XX,
    "overestimate_reasons": ["이유1", "이유2"],
    "underestimate_reasons": ["이유1"],
    "reasoning": "..."
  },
  "final": {
    "probability": 0.XX,
    "range": [0.XX, 0.XX],
    "confidence": "high"|"medium"|"low"
  },
  "sources": [{ "label": "...", "url": "...", "type": "research" }]
}`;

export function buildSuperforecasterPrompt(eventA: string, eventB: string, proposition: string): string {
  return `## 분석 대상
- 선행 이벤트 A: ${eventA}
- 후행 이벤트 B: ${eventB}
- 인과 명제: "${proposition}"

P(B|A)를 Superforecaster 4단계 프로토콜로 추정하세요.
JSON으로 응답.`;
}

// ============================================================

/** 극단화 평균 (Extremized Mean) */
export function extremize(probabilities: number[], d: number = 2.5): number {
  if (probabilities.length === 0) return 0.5;
  const avg = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
  // 극단값 보호
  const p = Math.max(0.01, Math.min(0.99, avg));
  const pD = Math.pow(p, d);
  const qD = Math.pow(1 - p, d);
  return Math.round((pD / (pD + qD)) * 100) / 100;
}
