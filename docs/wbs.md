# Bullini Causal Map — WBS (작업 분해 구조)

> **버전**: 2.0 (2026-03-24 업데이트)
> **기준 문서**: docs/prd.md

---

## Phase 1: 프로젝트 초기 설정 ✅ 완료

### 1.1 Next.js 프로젝트 스캐폴딩
- [x] `create-next-app` 실행 (TypeScript, Tailwind, App Router)
- [x] 보일러플레이트 제거
- [x] `next.config.ts` 기본 설정

### 1.2 UI 프레임워크
- [x] shadcn/ui 초기화
- [x] 다크 테마 (Bullini 커스텀 색상)
- [x] 컴포넌트: Button, Input, Card, Badge, Tabs, Sheet, Tooltip, ScrollArea

### 1.3 핵심 라이브러리
- [x] `@xyflow/react` (React Flow v12)
- [x] `zustand`
- [x] Geist 폰트 + JetBrains Mono

### 1.4 Python 통계 서버
- [x] FastAPI 앱 기본 구조 + venv + 의존성

### 1.5 타입 & 스토어
- [x] `lib/types/causal.ts`
- [x] `lib/store/causal-store.ts`
- [x] `.env.local` + `.env.local.example`

---

## Phase 2: UI 레이아웃 & 그래프 시각화 ✅ 완료

### 2.1 레이아웃
- [x] `app/layout.tsx` — 다크모드, 한국어
- [x] `app/page.tsx` — 메인 페이지
- [x] `components/layout/Header.tsx` — 헤더 + 미입력 경고 배지
- [x] `components/layout/ThreePanel.tsx` — 2-panel (좌+중앙) 레이아웃으로 변경

### 2.2 React Flow 그래프
- [x] `components/graph/CausalGraph.tsx` — 메인 캔버스 + 미니맵 + 신뢰도별 마커
- [x] `components/graph/nodes/EventNode.tsx` — 타원형 이벤트 노드
- [x] `components/graph/nodes/NumericNode.tsx` — 사각형 수치 노드
- [x] `components/graph/nodes/FinalNode.tsx` — 최종 타겟 노드
- [x] `components/graph/edges/CausalEdge.tsx` — 신뢰도 색상, 강도 굵기, 위/아래 파라미터
- [x] `lib/utils/graph-layout.ts` — 체인→React Flow 변환 + 자동 배치

### 2.3 좌측 패널
- [x] `components/summary/ChainList.tsx` — 체인 목록 + 호버 하이라이트
- [x] `components/summary/ImpactSummary.tsx` — 합산 영향도 + CI
- [x] `components/summary/Legend.tsx` — 범례

### 2.4 상세 패널 (좌측 통합)
- [x] `components/detail/DetailPanel.tsx` — 컨테이너
- [x] `components/detail/EdgeDetail.tsx` — 엣지 상세 (타입, 신뢰도, 명제, 근거, 출처)
- [x] `components/detail/ParamEditor.tsx` — 파라미터 편집 폼
- [ ] `components/detail/RationaleView.tsx` — 별도 컴포넌트 미분리 (EdgeDetail 내부에 포함)
- [ ] `components/detail/SourceList.tsx` — 별도 컴포넌트 미분리 (EdgeDetail 내부에 포함)

### 2.5 유틸리티
- [x] `lib/utils/impact-calc.ts` — 영향도 계산
- [x] `lib/utils/format.ts` — 숫자 포맷

---

## Phase 3: 뉴스 수집 & LLM 인과 체인 생성 ✅ 완료

### 3.1 Tavily 뉴스 검색
- [x] `lib/api/tavily.ts` — searchNews, searchMultiQuery, newsToSummaryText, newsToHintText
- [x] `app/api/news/route.ts` — 뉴스 검색 API Route
- [ ] `components/news/NewsPanel.tsx` — 뉴스 피드 패널 ❌ 미구현
- [ ] `components/news/NewsCard.tsx` — 개별 뉴스 카드 ❌ 미구현
- [x] `components/news/TopicInput.tsx` — 주제 직접 입력 폼

### 3.2 LLM 인과 체인 생성 (4단계 파이프라인)
- [x] `lib/api/claude.ts` — Claude API 클라이언트 (Sonnet/Haiku)
- [x] `lib/prompts/chain-generate.ts` — 4단계 프롬프트 (파싱, X→Y 분해, Y 원인 발굴, 검증)
- [x] `app/api/chain/generate/route.ts` — 4단계 파이프라인 오케스트레이션
- [x] 응답 파싱 + 고유 노드/엣지 ID 보장
- [x] 생성 중 로딩 UI ("생성 중..." 버튼)
- [ ] 생성 중 단계별 진행 상태 표시 (Step 1/4...) ❌ 미구현

### 3.3 체인 → 그래프 변환
- [x] CausalChain[] → React Flow 노드/엣지 변환
- [x] 자동 레이아웃 (체인별 행 배치 + 최종 노드 수렴)
- [x] Zustand 스토어 저장 + targetAsset LLM 자동 추출

---

## Phase 4: 파라미터 자동 추정 파이프라인 🔧 부분 구현

### 4.1 데이터 API 연동
- [x] `lib/api/fred.ts` — FRED API (getFredSeries, searchFredSeries) ✅ 작동 확인
- [x] `app/api/params/fred/route.ts` ✅ 작동 확인
- [x] `lib/api/dart.ts` — DART API (getDartFinancials, fs_div 포함) ✅ 작동 확인
- [x] `app/api/params/dart/route.ts` ✅ 작동 확인
- [ ] `lib/api/finnhub.ts` — Finnhub API ❌ 미구현

### 4.2 Python 통계 서버
- [x] `python/routers/numeric_to_numeric.py` — 정상성 검정 + OLS + Granger ✅ 작동 확인
- [x] `python/routers/event_study.py` — Event Study (CAR) ✅
- [x] `python/routers/numeric_to_event.py` — Logistic Regression ✅
- [x] `python/routers/propagation.py` — 전파 + 합산 + Monte Carlo ✅
- [x] `python/services/stats_service.py` — 공통 통계 유틸리티 ✅

### 4.3 LLM 파라미터 추정 — ❌ 핵심 미구현 영역
- [x] `app/api/params/estimate/route.ts` — 통합 추정 (현재 LLM 단순 호출만)
- [ ] **#1 데이터 소스 동적 식별 (Step 3a)** ❌
  - LLM(Haiku)이 엣지별 FRED series ID, DART 기업코드 등 자동 결정
  - `lib/prompts/data-identify.ts` 미구현
  - `app/api/params/identify-source/route.ts` 미구현
- [ ] **#2 Numeric→Numeric 자동 추정 통합 (F-06)** ❌
  - #1 → FRED/DART 데이터 수집 → Python OLS/Granger → 결과 저장
  - 개별 모듈은 구현됨, 연결 파이프라인이 없음
- [ ] **#3 Event→Numeric Δ 유사 사례 (F-07)** ❌
  - Tavily 유사 이벤트 검색 → LLM(Haiku) 수치 추출
- [x] **#4 Event→Event P Superforecaster (F-08)** ✅
  - 3방법 삼각측량 (역사적 빈도 + 예측시장 + Superforecaster) + 극단화 평균
- [x] **#5 Numeric→Event θ 규제 조회 (F-09)** ✅
  - 3경로: 규제 기준(Hard) → Logistic Regression(Soft) → 시장 관행(Soft)

### 4.4 추정 불가 처리
- [ ] **#6** 데이터 부족: LLM 추정 범위 + status="estimated" ❌
- [ ] **#6** 완전 불가: status="pending" + 범위 표시 ❌

---

## Phase 5: 인터랙션 & 폴리싱 🔧 부분 구현

### 5.1 영향도 계산
- [x] `lib/utils/impact-calc.ts` — 4가지 전파 규칙 + 가중 합산 + σ전파 ✅
- [x] **#8** 파라미터 변경 → 실시간 영향도 재계산 UI 연동 ✅
- [x] **#9** 시간대별 필터링 (6개월/1년/전체) ✅

### 5.2 인터랙션
- [x] 체인 목록 호버 → 그래프 하이라이트
- [x] 엣지 클릭 → 상세 패널
- [x] 그래프 미니맵
- [ ] 엣지 호버 → 파라미터 툴팁 ❌
- [ ] 노드 클릭 → 관련 엣지 표시 ❌

### 5.3 상태 처리
- [x] 생성 중 로딩 ("생성 중..." 버튼)
- [ ] **#10** 에러 상태 (토스트 메시지 + 재시도) ❌ (현재 alert만)
- [ ] 빈 상태 개선 ❌

### 5.4 포매팅
- [x] `lib/utils/format.ts` — 숫자 포맷
- [ ] 반응형 레이아웃 (최소 1280px) ❌

---

## 미구현 기능 우선순위

| # | 기능 | PRD | 의존성 | 난이도 |
|---|------|-----|--------|--------|
| **1** | 데이터 소스 동적 식별 (Step 3a) | F-06 전제 | 없음 | 중 |
| **2** | Numeric→Numeric 자동 추정 통합 | F-06 | #1 | 상 |
| **3** | Event→Numeric Δ 유사 사례 | F-07 | 없음 | 중 |
| **4** | Event→Event P Superforecaster | F-08 | 없음 | 상 |
| **5** | Numeric→Event θ 규제 조회 | F-09 | 없음 | 하 |
| **6** | 추정 불가 시 범위 표시 | F-06~09 | #2~5 | 하 |
| **7** | Finnhub API 연동 | — | 없음 | 하 |
| **8** | 실시간 영향도 재계산 UI | F-11 | 없음 | 중 |
| **9** | 시간대별 필터링 | F-11 | 없음 | 하 |
| **10** | 에러/빈 상태 UI 개선 | NF-02 | 없음 | 하 |
