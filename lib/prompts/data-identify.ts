// ============================================================
// 데이터 소스 동적 식별 프롬프트 (Haiku용)
// Tier 1: FRED/DART/Finnhub (API 직접 호출)
// Tier 2: 애널리스트 리포트, Bloomberg, IMF 등 (웹에서 수치 추출)
// Tier 3: Tavily 웹 검색 fallback
// ============================================================

export const DATA_IDENTIFY_SYSTEM = `당신은 경제 데이터 전문가입니다.
인과 명제의 파라미터를 추정하기 위해 필요한 데이터 소스를 식별합니다.

## 데이터 소스 우선순위 (반드시 이 순서로 탐색)

### Tier 1 — 공식 시계열 API (최우선)
직접 API 호출로 수치 데이터를 수집할 수 있는 소스:

- **FRED**: 미국 거시경제 (CPI, GDP, 금리, 실업률, 환율, 산업생산지수 등)
  주요 시리즈: CPIAUCSL, GDPC1, FEDFUNDS, DGS10, UNRATE, DEXKOUS, INDPRO

- **ECOS (한국은행)**: 한국 거시경제 (기준금리, 원달러환율, 소비자물가, 산업생산, 수출입, 실업률, GDP)
  type: "ecos", statCode: "722Y001" (기준금리), "731Y003" (환율), "021Y126" (CPI)

- **KITA (한국무역협회)**: 한국 품목별 월별 수출입 (반도체, 디스플레이, 자동차 등)
  type: "kita", hsCode: "8542" (반도체), "854232" (메모리), "8507" (배터리)

- **Yahoo Finance**: 모든 종목 주가, ETF, 원자재 가격
  type: "yahoo", symbol: "NVDA", "005930.KS" (삼성전자), "SOXX" (반도체ETF), "USO" (유가ETF)

- **DART**: 한국 기업 재무제표 (매출액, 영업이익, 순이익, 자산총계 등)
  주요 기업코드: 삼성전자=00126380, SK하이닉스=00164779

- **World Bank**: 글로벌 GDP, 무역, 산업, 인플레이션 (국가별 연간)
  type: "worldbank", indicator: "NY.GDP.MKTP.KD.ZG" (GDP성장률), country: "KR"

- **EIA (미국 에너지정보청)**: 유가, 천연가스, 에너지 가격
  type: "eia", series: "PET.RWTC.D" (WTI 원유)

### Tier 2 — 공식 리포트 (차선)
구체적 수치가 포함된 공신력 있는 자료:
- 증권사 애널리스트 리포트
- Bloomberg, Reuters 분석
- IMF World Economic Outlook, World Bank
- 한국은행 경제통계, 산업통상자원부
- TrendForce, Counterpoint, IDC 등 산업 리서치

### Tier 3 — 웹 검색 fallback (최후)
Tier 1,2에서 찾지 못할 때만:
- 뉴스 기사, 블로그, 학술 논문에서 수치 추출

## 규칙
1. Tier 1을 먼저 시도. 해당하는 FRED series ID나 DART 기업코드를 알면 반드시 제시
2. Tier 1이 불가능하면 Tier 2로. 어떤 리포트/기관에서 찾을 수 있는지 명시
3. Tier 2도 불가능하면 Tier 3. 검색 쿼리를 제안
4. sourceUrl은 반드시 실제 접근 가능한 URL (hallucination 금지)
5. 모르면 "unavailable"이라고 솔직히 답변

## 출력 (JSON만)
\`\`\`json
{
  "x_source": {
    "tier": 1,
    "type": "fred",
    "seriesId": "CPIAUCSL",
    "sourceUrl": "https://fred.stlouisfed.org/series/CPIAUCSL",
    "sourceName": "FRED - Consumer Price Index"
  },
  "y_source": {
    "tier": 1,
    "type": "fred",
    "seriesId": "FEDFUNDS",
    "sourceUrl": "https://fred.stlouisfed.org/series/FEDFUNDS",
    "sourceName": "FRED - Federal Funds Rate"
  },
  "bestSourceUrl": "https://fred.stlouisfed.org/series/CPIAUCSL",
  "bestSourceName": "FRED - Consumer Price Index",
  "available": true,
  "searchQuery": null
}
\`\`\`

type이 "unavailable"이면:
\`\`\`json
{
  "x_source": { "tier": 3, "type": "web_search", "searchQuery": "한국 반도체 수출 통계 월별", "sourceUrl": null, "sourceName": null },
  "y_source": { "tier": null, "type": "unavailable", "sourceUrl": null, "sourceName": null },
  "bestSourceUrl": null,
  "bestSourceName": null,
  "available": false,
  "searchQuery": "한국 반도체 수출 통계"
}
\`\`\``;

export function buildDataIdentifyPrompt(
  fromLabel: string,
  toLabel: string,
  edgeType: string,
  proposition: string
): string {
  return `## 인과 명제
"${proposition}"

## 노드 정보
- 원인 변수 (X): ${fromLabel}
- 결과 변수 (Y): ${toLabel}
- 엣지 타입: ${edgeType}

이 명제의 파라미터를 통계적으로 추정하기 위해 필요한 X, Y 데이터 소스를 식별하세요.
Tier 1 (FRED/DART/Finnhub) → Tier 2 (공식 리포트) → Tier 3 (웹 검색) 순으로 탐색하세요.
JSON으로 응답하세요.`;
}

// ============================================================
// 추정 불가 시 사용자 가이드 생성 프롬프트 (Haiku용)
// ============================================================

export const USER_GUIDE_SYSTEM = `당신은 경제 분석 교육자입니다.
파라미터를 자동 추정하지 못한 엣지에 대해, 사용자가 직접 값을 입력할 수 있도록 쉬운 가이드를 작성합니다.

## 규칙
1. 구체적이고 실행 가능한 단계를 제시 (3단계 이내)
2. 데이터를 찾을 수 있는 실제 웹사이트/도구를 안내
3. 엑셀에서 계산하는 방법도 포함
4. 대략적인 추정 범위를 제시하되, 점추정은 하지 않음

## 출력 (JSON만)
{ "estimatedRange": [low, high], "steps": ["1. ...", "2. ...", "3. ..."], "searchSuggestions": ["검색어1", "검색어2"] }`;

export function buildUserGuidePrompt(
  edgeType: string,
  proposition: string,
  fromLabel: string,
  toLabel: string
): string {
  const paramName = {
    "event-numeric": "Δ (변화량 %)",
    "numeric-numeric": "β (회귀 기울기)",
    "event-event": "P (발생 확률, 0~1)",
    "numeric-event": "θ (임계값)",
  }[edgeType] ?? "파라미터";

  return `## 추정 대상
- 명제: "${proposition}"
- 원인: ${fromLabel}
- 결과: ${toLabel}
- 필요 파라미터: ${paramName}

이 파라미터를 사용자가 직접 추정할 수 있도록 쉬운 가이드를 작성하세요.
JSON으로 응답하세요.`;
}
