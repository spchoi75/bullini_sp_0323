# Bullini Causal Map — 모듈별 구현 기록

> 각 엣지 타입별 파라미터 추정 모듈의 구현 방법 상세 기록

---

## Module A: Numeric→Numeric (β, r, p-value) — ✅ 구현 완료

### 구현 파일
- `python/routers/numeric_to_numeric.py` — 통계 계산 (OLS, Granger)
- `python/services/stats_service.py` — 공통 함수 (정상성 검정, 시차 탐색, 회귀)
- `lib/prompts/data-identify.ts` — Haiku 데이터 소스 식별
- `app/api/params/auto-estimate/route.ts` — estimateWithFred() 함수

### 파이프라인
1. **Haiku**: FRED series ID 매핑 (CPIAUCSL, FEDFUNDS 등)
2. **FRED API**: 시계열 데이터 수집 (2010~현재)
3. **Python**: 정상성 검정(ADF+KPSS) → 변환 결정 → 최적 시차 탐색(AIC) → OLS 회귀 → Granger 검정
4. **결과**: β, r, p-value, optimal_lag, granger_p, transform, n_obs

### 테스트 결과
- "CPI → 기준금리": β=0.058, r=0.27, p=0.0001, 192개 관측치, FRED 자동 매핑 성공

---

## Module B: Event→Numeric (Δ) — ✅ 구현 완료

### 구현 파일
- `python/routers/event_study.py` — Market Model Event Study (4구간 분할)
- `lib/prompts/event-to-numeric.ts` — 3전략 프롬프트
- `app/api/params/auto-estimate/route.ts` — trySimilarCases(), tryDecomposition()

### 3단계 전략
1. **전략 1 (Event Study)**: Market Model (R_i = α + β·R_m), 4구간 시간 분할, 정보유출 감지
   - 추정창[-250,-11], 사전이벤트[-10,-1], 이벤트일[0], 사후이벤트[+1,+10]
   - AR = R_t - (α + β·R_m,t), CAR = ΣAR, t-검정
   - (Finnhub 연동 후 활성화 예정)

2. **전략 2 (유사 사례)**: Tavily 검색 → Haiku 수치 추출 → 3건 이상이면 중앙값 채택

3. **전략 3 (4경로 분해)**: Sonnet이 직접/간접/심리/상쇄 효과로 분해 추정
   - 직접: 매출 비중 × 관세 영향
   - 간접: 공급망 변화, 경쟁사 반사이익
   - 심리: 섹터 전반 심리 위축
   - 상쇄: 대체 수요, 정부 지원

### 테스트 결과
- "대중국 수출규제 → 한국 반도체 수출": 전략 3 작동, Δ=-5%, 범위[-10, 0.5]

---

## Module C: Event→Event (P 확률) — ✅ 구현 완료

### 구현 파일
- `lib/prompts/event-to-event.ts` — 3방법 프롬프트 + extremize()
- `app/api/params/auto-estimate/route.ts` — tryHistoricalFrequency(), tryPredictionMarket(), trySuperforecaster(), estimateEventToEvent()

### 3방법 삼각측량 파이프라인
1. **역사적 빈도 분석** (Haiku): 참고류 정의 → 사례 5건+ 검색 → P = 성공/전체
2. **예측 시장 조회** (Tavily+Haiku): Polymarket/Metaculus 검색 → 확률 추출
3. **Superforecaster 프로토콜** (Sonnet): 외부관점(기저율) → 내부관점(조정) → 반대관점(Red Team) → 최종(0.05단위)
4. **극단화 평균**: p_ext = p^d / (p^d + (1-p)^d), d=2.5
5. 신뢰도: 3방법 수렴(±10%p)=high, 2방법=medium, 1방법=low

### 테스트 결과
- "트럼프 재선 → 반도체 보조금 축소": 예측시장 0.57 + Superforecaster 0.70 → 극단화 0.80
- 출처: Polymarket, congress.gov, Brookings

---

## Module D: Numeric→Event (θ 임계값) — ✅ 구현 완료

### 구현 파일
- `python/routers/numeric_to_event.py` — Logistic Regression (경로 2)
- `lib/prompts/numeric-to-event.ts` — 규제/관행 임계값 조회 프롬프트
- `app/api/params/auto-estimate/route.ts` — numeric-event 분기

### 3경로 파이프라인
1. **경로 1 (규제 기준)**: Haiku로 법적/규제적 Hard Threshold 조회 (Basel III, Dodd-Frank 등)
2. **경로 2 (Logistic Regression)**: Python에서 데이터 기반 Soft Threshold 산출 (θ=-β₀/β₁, k=β₁)
3. **경로 3 (시장 관행)**: Haiku로 관행적 Soft Threshold 추정 (VIX 30, 환율 1400 등) + 민감도 k 추정

### Hard vs Soft Threshold
- **Hard**: θ를 넘는 순간 P=0→1 점프 (법규), k=999
- **Soft**: P = 1/(1+exp(-k·(X-θ))), 점진적 전이 (시장 심리), k=3~15

### 테스트 결과
- "CET1 비율 → 자본 부족": Hard, θ=4.5%, k=999, 출처=BIS Basel III
- "VIX → 시장 공포": Soft, θ=30, k=6, 시장 관행 기반

---

## 공통: 추정 불가 시 처리

### 원칙
- **할루시네이션 금지**: 근거 없으면 반드시 null
- **추정 범위만 제시**: estimatedRange: [low, high]
- **사용자 가이드**: 직접 입력할 수 있는 단계별 안내

### 구현
- `lib/prompts/data-identify.ts` — buildUserGuidePrompt()
- `app/api/params/auto-estimate/route.ts` — estimateWithLlmFallback()

---

## 데이터 소스 우선순위

| Tier | 소스 | 신뢰도 |
|------|------|--------|
| 1 | FRED, DART, Finnhub (API 직접 호출) | 최고 |
| 2 | 애널리스트 리포트, Bloomberg, IMF (공식 자료) | 높음 |
| 3 | Tavily 웹 검색 (뉴스, 블로그, 논문) | 보통 |
| — | LLM 추론 (근거 기반) | 낮음 |
| — | null + 가이드 (근거 없음) | — |
