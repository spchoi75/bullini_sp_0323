# Bullini Causal Map — PRD (제품 요구사항 문서)

> **버전**: 1.0
> **작성일**: 2026-03-24
> **상태**: Draft

---

## 1. 제품 개요

### 1.1 제품명
Bullini Causal Map

### 1.2 목적
경제 뉴스와 매크로 이벤트를 **인과 그래프(Causality Graph)** 로 구조화하여, 특정 자산군(주가지수 등)에 대한 정량적 영향도를 자동 산출하는 인터랙티브 분석 플랫폼.

### 1.3 배경
글로벌 매크로 투자에서 "경제와 시황에 관한 막연한 생각"을 "구체적이고 정량적인 수치(확률, 기대수익률)"로 변환하는 것이 핵심 역량이다. 인과 그래프는 이 변환을 체계적으로 수행하는 도구로, 명제를 세부적으로 분해하고 각 연결고리의 강도를 정량화한다.

### 1.4 사용자
- 글로벌 매크로 분석가 / 자산배분 담당자
- 경제·시장 인과관계를 정량적으로 분석하고자 하는 개인 투자자

### 1.5 범위
- **포함**: 뉴스 수집, 인과 체인 자동 생성, 파라미터 자동 추정, 인터랙티브 시각화, 영향도 합산
- **제외**: 사용자 인증, 멀티테넌트, 실시간 알림, 모바일 앱

---

## 2. 용어 정의 (SSOT)

| 용어 | 정의 |
|------|------|
| **노드(Node)** | 인과 그래프의 꼭짓점. 이벤트 노드(발생/비발생) 또는 수치 노드(계량화 가능한 경제 지표) |
| **엣지(Edge)** | 노드 간 인과 관계를 나타내는 화살표. 4가지 타입 존재 |
| **체인(Chain)** | 루트 노드에서 최종 타겟 노드까지의 인과 경로 (3~5개 노드) |
| **프로젝트(Project)** | 하나의 분석 주제에 대한 전체 인과 그래프 (여러 체인 포함) |
| **Δ (delta)** | 이벤트 발생 시 수치 변수의 변화량 (%) |
| **β (beta)** | 수치→수치 회귀 계수 (X가 1단위 변할 때 Y의 변화량) |
| **r** | Pearson 상관계수 (-1 ~ +1) |
| **p-value** | 통계적 유의성 (낮을수록 우연이 아닐 확률 높음) |
| **P (probability)** | 이벤트→이벤트 조건부 발생 확률 (0~1) |
| **θ (theta)** | 수치→이벤트 임계값 (이 수준을 넘으면 이벤트 트리거) |
| **timeLag** | 인과 영향이 전파되는 데 걸리는 시간 (년 단위, 0.25 = 3개월) |
| **confidence** | 추정 신뢰도 (high / medium / low) |
| **ParamStatus** | 파라미터 상태: auto(자동 산출) / manual(사용자 입력) / estimated(LLM 추정) / pending(미입력) |

---

## 3. 기능 요구사항

### F-01: 주제 입력

| 항목 | 내용 |
|------|------|
| **Input** | 사용자가 텍스트로 분석 주제 입력 (예: "한국 반도체 기업 주가에 영향을 미치는 요인") |
| **Process** | 입력값을 프로젝트 title 및 targetAsset으로 저장 |
| **Output** | CausalProject 객체 생성, 좌측 패널에 주제 표시 |

### F-02: 뉴스 검색 & 선택

| 항목 | 내용 |
|------|------|
| **Input** | 검색 키워드 (자동: 주제에서 추출 / 수동: 사용자 입력) |
| **Process** | Tavily Search API 호출 → 경제/산업 뉴스 10~20건 반환 |
| **Output** | 뉴스 카드 목록 (제목, 요약, URL, 날짜). 사용자가 관심 뉴스 선택(복수) |
| **Fallback** | API 실패 시: 에러 메시지 표시, 주제 직접 입력으로 유도 |

### F-03: 인과 체인 자동 생성

| 항목 | 내용 |
|------|------|
| **Input** | 주제 + 선택된 뉴스 컨텍스트 |
| **Process** | Claude API(Sonnet) 호출. 주제를 경제학적 명제로 분해 → 노드/엣지 구조 생성 |
| **Output** | CausalChain[] 배열 (각 체인: 3~5 노드, 2~4 엣지). 각 엣지에 edgeType, proposition, confidence, timeLag, 데이터 소스 힌트 포함 |
| **제약** | 노드 타입은 반드시 event 또는 numeric. 엣지 타입은 소스/타겟 노드 타입에 의해 결정됨. DAG 구조 강제 (순환 금지) |
| **Fallback** | LLM 응답 파싱 실패 시: 에러 표시 + 재시도 버튼 |

### F-04: 인과 그래프 시각화

| 항목 | 내용 |
|------|------|
| **Input** | CausalChain[] 데이터 |
| **Process** | React Flow 캔버스에 노드/엣지 렌더링. 자동 레이아웃 적용 (체인별 행 배치, 최종 노드로 수렴) |
| **Output** | 인터랙티브 그래프: 드래그, 줌, 패닝, 호버 하이라이트 |
| **노드 디자인** | 이벤트=둥근 모서리+색상 테두리, 수치=직각 사각형+어두운 배경, 최종=강조 테두리 |
| **엣지 디자인** | 확정 파라미터=실선, 미입력=점선(노란), 신뢰도=컬러 도트(green/yellow/red) |

### F-05: 엣지 상세 패널

| 항목 | 내용 |
|------|------|
| **Input** | 사용자가 엣지 클릭 |
| **Process** | 우측 패널에 해당 엣지의 상세 정보 표시 |
| **Output** | edgeType 배지, confidence 표시, timeLag, proposition, 파라미터 값(편집 가능), 추정 근거(rationale), 근거 자료 링크 목록 |

### F-06: 파라미터 자동 추정 — Numeric→Numeric

| 항목 | 내용 |
|------|------|
| **Input** | 엣지 정보 + LLM이 식별한 데이터 소스 힌트 (FRED series ID 등) |
| **Process** | ① LLM(Haiku)이 필요한 FRED/DART 시리즈 식별 → ② FRED/DART API로 시계열 수집 → ③ Python FastAPI에서 통계 계산 (정상성 검정 → 변환 결정 → 최적 시차 탐색 → OLS 회귀 → Granger 검정) |
| **Output** | { β, r, p_value, optimal_lag, granger_p, transform, n_obs, confidence } |
| **신뢰도 판정** | p<0.01 AND n≥120 AND granger_p<0.05 → high / p<0.05 AND n≥60 → medium / 그 외 → low |
| **Fallback** | FRED/DART 데이터 부재 시: LLM(Sonnet)이 추정 범위 제공 (status: estimated) |

### F-07: 파라미터 자동 추정 — Event→Numeric

| 항목 | 내용 |
|------|------|
| **Input** | 이벤트 설명, 대상 수치 변수 |
| **Process** | 3단계 전략: ① 실측 데이터 Event Study (가능 시) → ② 유사 사례 기반 Δ 추정 (Tavily+LLM) → ③ LLM 분해 추정 (Decomposition Prompting) |
| **Output** | { delta, delta_range:[low,high], confidence, method, rationale, sources[] } |
| **신뢰도 판정** | Event Study 실측+p<0.05 → high / 유사 사례 3+개 → medium / LLM만 → low |

### F-08: 파라미터 자동 추정 — Event→Event

| 항목 | 내용 |
|------|------|
| **Input** | 선행 이벤트 A, 후행 이벤트 B |
| **Process** | 다중 방법 삼각측량: ① 역사적 빈도 분석 → ② 예측시장 조회 (Metaculus 등, 가용 시) → ③ LLM 구조적 추정 (Superforecaster 프로토콜). 집계: 3방법 → Extremized Mean, 2방법 → 평균, 1방법 → 그대로 |
| **Output** | { probability, confidence, methods_used[], decomposition[], rationale, sources[] } |
| **신뢰도 판정** | 3방법 수렴(±10%p)+사례 10+ → high / 2방법 일치 → medium / LLM만 → low |

### F-09: 파라미터 자동 추정 — Numeric→Event

| 항목 | 내용 |
|------|------|
| **Input** | 수치 변수, 트리거 이벤트 |
| **Process** | 3경로: ① 규제/공식 임계값 조회 (LLM) → ② Logistic Regression (데이터 있을 때) → ③ LLM + 교차검증 |
| **Output** | { theta, threshold_type:"hard"\|"soft", sigmoid_params?, confidence, source } |
| **신뢰도 판정** | 규제 기준 확인 → high / Logistic p<0.05 → medium / LLM 미검증 → low |

### F-10: 파라미터 수동 편집

| 항목 | 내용 |
|------|------|
| **Input** | 사용자가 상세 패널에서 파라미터 값 직접 입력/수정 |
| **Process** | 입력값 유효성 검증 (숫자, 범위). Zustand 스토어 업데이트. paramStatus → "manual" |
| **Output** | 그래프 엣지 라벨 즉시 갱신, 영향도 재계산 |

### F-11: 영향도 전파 & 합산

| 항목 | 내용 |
|------|------|
| **Input** | 모든 체인의 노드/엣지 + 파라미터 |
| **Process** | ① DAG 위상 정렬 → ② 엣지별 전파 규칙 적용 (곱셈) → ③ 체인별 최종 영향도 산출 → ④ 가중 합산 (w = confidence × (1-p) × completeness) → ⑤ 불확실성 계산 (분석적/Monte Carlo) |
| **Output** | 체인별 impact + 합산 total + 95% CI. null 체인은 별도 표시 |
| **시간 필터** | 시간대별 필터링 (6개월/1년/전체) 지원 |

### F-12: 체인별 영향도 요약 패널

| 항목 | 내용 |
|------|------|
| **Input** | 계산된 영향도 데이터 |
| **Process** | 좌측 패널 하단에 체인 목록 + 영향도 + 신뢰도 색상 표시 |
| **Output** | 체인명, 영향도(%), 신뢰도 도트, timeLag, 합산 영향도, 95% CI, 미정량 체인 경고 |
| **인터랙션** | 체인 호버 → 그래프에서 해당 체인 하이라이트. 체인 클릭 → 첫 번째 엣지 선택 |

---

## 4. 비기능 요구사항

### NF-01: 성능
- 인과 체인 생성 (LLM): 30초 이내 (스트리밍 진행 표시)
- 파라미터 자동 추정 (단일 엣지): 15초 이내
- 영향도 재계산 (클라이언트): 100ms 이내
- React Flow 렌더링: 50개 노드까지 60fps

### NF-02: 에러 처리
- 모든 외부 API 호출은 timeout(30초) + retry(1회) 적용
- API 호출 실패 시 구체적 에러 메시지 표시 (어떤 API가, 어떤 사유로 실패)
- **API 미작동 보고 의무**: 호출했는데 작동하지 않는 API가 있으면 fallback 전에 반드시 사용자에게 보고

### NF-03: 데이터 저장
- Phase 1~5: 브라우저 로컬스토리지 (서버 DB 없음)
- 프로젝트 데이터 JSON export/import 지원 (향후)

### NF-04: UI/UX
- 다크 테마 기본 (zinc/neutral 토큰, 단일 accent 색상)
- Geist Sans(UI 텍스트) + JetBrains Mono(수치/코드)
- 반응형: 최소 1280px 너비 지원

---

## 5. 기술 스택

| 계층 | 기술 | 용도 |
|------|------|------|
| 프론트엔드 | Next.js 16 (App Router), TypeScript | SPA + API Routes |
| UI 프레임워크 | Tailwind CSS + shadcn/ui | 컴포넌트 시스템 |
| 그래프 시각화 | React Flow | 노드/엣지 인터랙티브 렌더링 |
| 상태관리 | Zustand | 글로벌 스토어 |
| 통계 서버 | Python FastAPI | 회귀분석, 상관관계, Granger, 임계값 추정 |
| LLM | Anthropic Claude (Sonnet=고급추론, Haiku=간단작업) | 인과 체인 생성, 파라미터 추정 |
| LLM (보조) | OpenAI GPT (필요시) | 보완/교차 검증 |
| 뉴스 | Tavily Search API | 경제 뉴스 검색 |
| 경제 데이터 | FRED API | 미국/글로벌 거시경제 시계열 |
| 기업 데이터 | DART API | 한국 기업 재무제표/공시 |
| 주가 데이터 | Finnhub API | 주가, 시장 데이터 |

---

## 6. API 엔드포인트

### 6.1 Next.js API Routes

| 엔드포인트 | 메서드 | Input | Output |
|-----------|--------|-------|--------|
| `/api/news` | POST | { query: string } | { articles: NewsArticle[] } |
| `/api/chain/generate` | POST | { topic: string, articles: NewsArticle[] } | { chains: CausalChain[] } |
| `/api/chain/refine` | POST | { chain: CausalChain, instruction: string } | { chain: CausalChain } |
| `/api/params/estimate` | POST | { edge: CausalEdge } | { params, paramMeta, rationale, sources } |
| `/api/params/fred` | POST | { seriesId: string, startDate?, endDate? } | { series: DataPoint[] } |
| `/api/params/dart` | POST | { corpCode: string, reportType: string } | { financials: FinancialData } |
| `/api/stats` | POST | { endpoint: string, payload: object } | Python 서버 응답 프록시 |

### 6.2 Python FastAPI

| 엔드포인트 | 메서드 | Input | Output |
|-----------|--------|-------|--------|
| `/compute/numeric-to-numeric` | POST | { x_series, y_series, frequency, max_lag } | { beta, r, p_value, optimal_lag, granger_p, transform, n_obs, confidence } |
| `/compute/event-study` | POST | { event_date, price_series, market_series? } | { car, p_value, event_window, confidence } |
| `/compute/numeric-to-event` | POST | { x_series, event_binary, method } | { theta, threshold_type, sigmoid_params, roc_auc, confidence } |
| `/compute/stationarity` | POST | { series } | { adf_p, kpss_p, is_stationary, recommended_transform } |
| `/compute/optimal-lag` | POST | { x_series, y_series, max_lag } | { all_lags[], best_lag_aic, best_lag_r } |
| `/compute/propagate` | POST | { chain } | { impact, confidence, sigma } |
| `/compute/aggregate` | POST | { chains[], correlation_matrix? } | { total_impact, sigma, ci_95, per_chain[] } |
| `/compute/monte-carlo` | POST | { chains[], n_simulations } | { mean, median, ci_95, p_positive, histogram } |

---

## 7. 데이터 모델

```typescript
// === 노드 ===
type NodeType = 'event' | 'numeric' | 'final';

interface CausalNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  chainId: string;
}

// === 엣지 ===
type EdgeType = 'event-numeric' | 'numeric-numeric' | 'event-event' | 'numeric-event';
type Confidence = 'high' | 'medium' | 'low';
type ParamStatus = 'auto' | 'manual' | 'estimated' | 'pending';

interface EdgeParams {
  delta?: number | null;
  beta?: number | null;
  r?: number | null;
  p?: number | null;
  probability?: number | null;
  theta?: number | null;
}

interface ParamMeta {
  status: ParamStatus;
  method: string;
  estimatedRange?: [number, number];
}

interface Source {
  label: string;
  url: string;
  type: 'news' | 'data' | 'research' | 'official';
}

interface CausalEdge {
  id: string;
  from: string;
  to: string;
  edgeType: EdgeType;
  proposition: string;
  params: EdgeParams;
  paramMeta: Record<string, ParamMeta>;
  timeLag: number;
  confidence: Confidence;
  rationale: string;
  sources: Source[];
}

// === 체인 & 프로젝트 ===
interface CausalChain {
  id: string;
  label: string;
  color: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

interface CausalProject {
  id: string;
  title: string;
  targetAsset: string;
  chains: CausalChain[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 8. 구현 Phase

### Phase 1: 프로젝트 초기 설정
- [ ] Next.js 프로젝트 생성 (TypeScript, Tailwind, App Router)
- [ ] shadcn/ui 초기화 + 다크 테마
- [ ] React Flow, Zustand 설치
- [ ] Python FastAPI 프로젝트 초기화 + 의존성 설치
- [ ] 타입 정의 (lib/types/causal.ts)
- [ ] Zustand 스토어 기본 구조 (lib/store/causal-store.ts)
- [ ] .env.local 설정 확인

### Phase 2: UI 레이아웃 & 그래프 시각화
- [ ] 3-Panel 레이아웃 (Header + 좌측 320px + 중앙 + 우측 360px)
- [ ] React Flow 캔버스 + 자동 레이아웃
- [ ] 커스텀 노드 3종 (EventNode, NumericNode, FinalNode)
- [ ] 커스텀 엣지 (CausalEdge + EdgeLabel)
- [ ] 체인 목록 & 영향도 요약 (좌측 패널)
- [ ] 엣지 상세 패널 (우측 패널: 파라미터 편집, 근거, 출처)
- [ ] 범례 컴포넌트

### Phase 3: 뉴스 수집 & LLM 인과 체인 생성
- [ ] Tavily API 연동 (/api/news)
- [ ] 뉴스 피드 UI (NewsPanel, NewsCard)
- [ ] 주제 입력 UI (TopicInput)
- [ ] Claude API 연동 (/api/chain/generate)
- [ ] 인과 체인 생성 프롬프트 설계
- [ ] 생성된 체인 → React Flow 그래프 변환

### Phase 4: 파라미터 자동 추정 파이프라인
- [ ] FRED API 연동 (/api/params/fred)
- [ ] DART API 연동 (/api/params/dart)
- [ ] Finnhub API 연동 (주가 데이터)
- [ ] Python 통계 서버 엔드포인트 8개 구현
- [ ] LLM 기반 데이터 소스 동적 식별
- [ ] 4가지 엣지 타입별 추정 파이프라인 통합
- [ ] 추정 불가 시 범위 표시 로직

### Phase 5: 인터랙션 & 폴리싱
- [ ] 실시간 영향도 전파 & 합산 계산
- [ ] Monte Carlo 시뮬레이션 (불확실성)
- [ ] 체인 하이라이트 인터랙션
- [ ] 시간대별 필터링
- [ ] 로딩/에러/빈 상태 처리
- [ ] 반응형 레이아웃 조정

---

## 9. 검증 기준

| # | 검증 항목 | 방법 | 기대 결과 |
|---|----------|------|----------|
| V-01 | Tavily 뉴스 검색 | "반도체" 검색 | 10건 이상 뉴스 카드 표시 |
| V-02 | 인과 체인 생성 | 주제 입력 후 생성 버튼 | 3개 이상 체인, 각 3~5 노드 |
| V-03 | 그래프 렌더링 | 생성된 체인 확인 | React Flow에 노드/엣지 정상 표시 |
| V-04 | FRED 데이터 조회 | CPI 시리즈 요청 | 120개 이상 월간 데이터 반환 |
| V-05 | 통계 계산 | 두 시계열 회귀분석 | β, r, p-value가 엑셀 결과와 일치 |
| V-06 | 파라미터 자동 추정 | Numeric→Numeric 엣지 | β, r, p, lag 자동 산출 |
| V-07 | 수동 편집 | 파라미터 값 변경 | 영향도 즉시 재계산 |
| V-08 | 영향도 합산 | 전체 체인 영향도 | 가중 합산 + 95% CI 표시 |
| V-09 | null 체인 처리 | 미입력 파라미터 존재 | 해당 체인 제외 + 경고 표시 |
| V-10 | API 에러 처리 | 잘못된 API 키 | 구체적 에러 메시지 + fallback 안내 |
