# Bullini Causal Map — WBS (작업 분해 구조)

> **버전**: 1.0
> **작성일**: 2026-03-24
> **기준 문서**: docs/prd.md

---

## Phase 1: 프로젝트 초기 설정 (예상: 1세션)

### 1.1 Next.js 프로젝트 스캐폴딩
- [ ] `create-next-app` 실행 (TypeScript, Tailwind, App Router, src 미사용)
- [ ] 불필요한 보일러플레이트 제거
- [ ] `next.config.ts` 기본 설정

### 1.2 UI 프레임워크
- [ ] shadcn/ui 초기화 (`npx shadcn@latest init`)
- [ ] 다크 테마 기본 설정 (zinc 기반)
- [ ] 필수 컴포넌트 설치: Button, Input, Card, Badge, Tabs, Sheet, Tooltip, ScrollArea

### 1.3 핵심 라이브러리 설치
- [ ] `@xyflow/react` (React Flow v12)
- [ ] `zustand` (상태관리)
- [ ] Geist 폰트 + JetBrains Mono 설정

### 1.4 Python 통계 서버
- [ ] `python/` 디렉토리 생성
- [ ] `pyproject.toml` + `requirements.txt` 작성
- [ ] FastAPI 앱 기본 구조 (`main.py`)
- [ ] 가상환경 생성 + 의존성 설치

### 1.5 타입 & 스토어 기초
- [ ] `lib/types/causal.ts` — 전체 타입 정의 (PRD §7 기준)
- [ ] `lib/store/causal-store.ts` — Zustand 스토어 초기 구조
- [ ] `.env.local` 확인 + `.env.local.example` 생성 (키 없이 변수명만)

---

## Phase 2: UI 레이아웃 & 그래프 시각화 (예상: 2세션)

### 2.1 레이아웃 컴포넌트
- [ ] `app/layout.tsx` — 루트 레이아웃 (다크모드, 폰트, globals.css)
- [ ] `app/page.tsx` — 메인 페이지
- [ ] `components/layout/Header.tsx` — 헤더 (프로젝트명, 미입력 경고)
- [ ] `components/layout/ThreePanel.tsx` — 3-panel 레이아웃 컨테이너

### 2.2 React Flow 그래프
- [ ] `components/graph/CausalGraph.tsx` — React Flow 메인 캔버스
- [ ] `components/graph/nodes/EventNode.tsx` — 이벤트 노드 (둥근 모서리)
- [ ] `components/graph/nodes/NumericNode.tsx` — 수치 노드 (직각 사각형)
- [ ] `components/graph/nodes/FinalNode.tsx` — 최종 타겟 노드
- [ ] `components/graph/edges/CausalEdge.tsx` — 커스텀 엣지 (파라미터 라벨)
- [ ] `components/graph/edges/EdgeLabel.tsx` — 엣지 위 파라미터 표시
- [ ] `lib/utils/graph-layout.ts` — 체인→React Flow 노드/엣지 변환 + 자동 배치

### 2.3 좌측 패널
- [ ] `components/summary/ChainList.tsx` — 체인 목록 (색상, 호버 하이라이트)
- [ ] `components/summary/ImpactSummary.tsx` — 체인별 영향도 + 합산 + CI
- [ ] 범례 컴포넌트 (노드 타입, 엣지 상태, 신뢰도 색상)

### 2.4 우측 패널
- [ ] `components/detail/DetailPanel.tsx` — 상세 패널 컨테이너
- [ ] `components/detail/EdgeDetail.tsx` — 엣지 상세 (edgeType, confidence, timeLag)
- [ ] `components/detail/ParamEditor.tsx` — 파라미터 편집 폼 (edgeType별 다른 필드)
- [ ] `components/detail/RationaleView.tsx` — 추정 근거 표시
- [ ] `components/detail/SourceList.tsx` — 근거 자료 링크 목록

### 2.5 상태 연결
- [ ] Zustand 스토어 ↔ React Flow 동기화
- [ ] 엣지 클릭 → 상세 패널 열기
- [ ] 체인 호버 → 그래프 하이라이트 (해당 체인만 불투명, 나머지 dim)
- [ ] 파라미터 편집 → 스토어 업데이트 → 그래프 반영

---

## Phase 3: 뉴스 수집 & LLM 인과 체인 생성 (예상: 2세션)

### 3.1 Tavily 뉴스 검색
- [ ] `lib/api/tavily.ts` — Tavily API 클라이언트
- [ ] `app/api/news/route.ts` — 뉴스 검색 API Route
- [ ] `components/news/NewsPanel.tsx` — 뉴스 피드 패널
- [ ] `components/news/NewsCard.tsx` — 개별 뉴스 카드
- [ ] `components/news/TopicInput.tsx` — 주제 직접 입력 폼

### 3.2 LLM 인과 체인 생성
- [ ] `lib/api/claude.ts` — Claude API 클라이언트 (Sonnet/Haiku 분기)
- [ ] `lib/prompts/chain-generate.ts` — 인과 체인 생성 프롬프트
- [ ] `app/api/chain/generate/route.ts` — 체인 생성 API Route
- [ ] 응답 파싱 + CausalChain[] 타입 검증
- [ ] 생성 중 스트리밍/로딩 UI

### 3.3 체인 → 그래프 변환
- [ ] 생성된 CausalChain[] → React Flow 노드/엣지 데이터 변환
- [ ] 자동 레이아웃 적용 (체인별 행 배치 + 최종 노드 수렴)
- [ ] Zustand 스토어에 저장

---

## Phase 4: 파라미터 자동 추정 파이프라인 (예상: 3세션)

### 4.1 데이터 API 연동
- [ ] `lib/api/fred.ts` — FRED API 클라이언트
- [ ] `app/api/params/fred/route.ts` — FRED 데이터 조회 Route
- [ ] `lib/api/dart.ts` — DART API 클라이언트
- [ ] `app/api/params/dart/route.ts` — DART 데이터 조회 Route
- [ ] `lib/api/finnhub.ts` — Finnhub API 클라이언트 (주가 데이터)

### 4.2 Python 통계 서버 구현
- [ ] `python/routers/numeric_to_numeric.py` — 정상성 검정 + 최적 시차 + OLS + Granger
- [ ] `python/routers/event_study.py` — Event Study (CAR, 비정상수익)
- [ ] `python/routers/numeric_to_event.py` — Logistic Regression / 임계값 추정
- [ ] `python/routers/stationarity.py` — ADF + KPSS 정상성 검정
- [ ] `python/routers/propagation.py` — 영향도 전파 + 합산 + Monte Carlo
- [ ] `python/services/stats_service.py` — 공통 통계 유틸리티
- [ ] 각 엔드포인트 입출력 검증 (Pydantic 모델)

### 4.3 LLM 파라미터 추정 통합
- [ ] `lib/prompts/param-estimate.ts` — 파라미터 추정 프롬프트 (4가지 엣지 타입별)
- [ ] `lib/prompts/data-identify.ts` — 필요 데이터 소스 식별 프롬프트
- [ ] `app/api/params/estimate/route.ts` — 통합 추정 API Route
- [ ] 엣지 타입별 추정 전략 분기 로직

### 4.4 추정 불가 처리
- [ ] 데이터 부족 시: LLM 추정 범위 + status="estimated"
- [ ] 완전 추정 불가: status="pending" + 사용자 입력 유도 UI
- [ ] 각 파라미터에 ParamMeta (method, estimatedRange) 저장

---

## Phase 5: 인터랙션 & 폴리싱 (예상: 1세션)

### 5.1 영향도 계산
- [ ] `lib/utils/impact-calc.ts` — 클라이언트 측 영향도 계산 (간단한 곱셈 전파)
- [ ] 파라미터 변경 → 실시간 영향도 재계산
- [ ] 시간대별 필터링 (6개월/1년/전체)

### 5.2 인터랙션 완성
- [ ] 체인 목록 호버 → 그래프 체인 하이라이트
- [ ] 엣지 호버 → 파라미터 툴팁
- [ ] 노드 클릭 → 관련 엣지 표시
- [ ] 그래프 미니맵

### 5.3 상태 처리
- [ ] 로딩 상태 (스켈레톤, 스피너)
- [ ] 에러 상태 (API 실패 시 토스트 메시지 + 재시도 버튼)
- [ ] 빈 상태 (첫 사용 시 안내)
- [ ] API 미작동 시 사용자 보고 로직

### 5.4 포매팅
- [ ] `lib/utils/format.ts` — 숫자 포맷 (β=0.45, p=2.8e-28, Δ=+30%)
- [ ] 반응형 레이아웃 (최소 1280px)
- [ ] 최종 UI 폴리싱

---

## 의존성 관계

```
Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4 ──→ Phase 5
  │              │             │            │
  └── 타입정의    └── UI 기초    └── LLM 연동  └── 통계서버
      스토어          그래프         뉴스API       추정 파이프라인
```

- Phase 2는 Phase 1의 타입/스토어에 의존
- Phase 3은 Phase 2의 UI 컴포넌트에 의존
- Phase 4는 Phase 3의 LLM 클라이언트 + Phase 2의 상세 패널에 의존
- Phase 5는 Phase 4의 파라미터 데이터에 의존
