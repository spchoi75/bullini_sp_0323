// ============================================
// Bullini Causal Map — 핵심 타입 정의 (SSOT)
// ============================================

// --- 노드 ---

export type NodeType = "event" | "numeric" | "final";

export interface CausalNode {
  id: string;
  label: string;
  type: NodeType;
  description?: string;
  chainId: string;
}

// --- 엣지 ---

export type EdgeType =
  | "event-numeric" // Δ (변화량 %)
  | "numeric-numeric" // β, r, p-value
  | "event-event" // P (발생 확률)
  | "numeric-event"; // θ (임계점)

export type Confidence = "high" | "medium" | "low";

export type ParamStatus = "auto" | "manual" | "estimated" | "pending";

export interface EdgeParams {
  delta?: number | null; // Event→Numeric: 변화량 %
  beta?: number | null; // Numeric→Numeric: 회귀 기울기
  r?: number | null; // Numeric→Numeric: 상관계수
  p?: number | null; // Numeric→Numeric: p-value
  probability?: number | null; // Event→Event: 발생 확률
  theta?: number | null; // Numeric→Event: 임계점
}

export interface ParamMeta {
  status: ParamStatus;
  method: string; // 산출 방법 설명
  estimatedRange?: [number, number]; // 추정 범위 [low, high]
}

export interface Source {
  label: string;
  url: string;
  type: "news" | "data" | "research" | "official";
}

export interface CausalEdge {
  id: string;
  from: string; // 소스 노드 ID
  to: string; // 타겟 노드 ID
  edgeType: EdgeType;
  proposition: string; // 인과 명제
  params: EdgeParams;
  paramMeta: Record<string, ParamMeta>;
  timeLag: number; // 영향 전파 시간 (년)
  confidence: Confidence;
  rationale: string; // 추정 근거
  sources: Source[];
}

// --- 체인 & 프로젝트 ---

export const CHAIN_COLORS = [
  "#7eb8d0",
  "#5eaba2",
  "#9b8ec4",
  "#d4726a",
  "#d4975a",
  "#6aad82",
] as const;

export interface CausalChain {
  id: string;
  label: string;
  color: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface CausalProject {
  id: string;
  title: string; // 분석 주제
  targetAsset: string; // 최종 타겟 자산
  chains: CausalChain[];
  createdAt: string;
  updatedAt: string;
}

// --- 영향도 계산 결과 ---

export interface ChainImpact {
  chainId: string;
  impact: number | null; // 최종 영향도 (%)
  confidence: number; // 전파된 신뢰도 (0~1)
  sigma: number | null; // 표준 오차
  totalTimeLag: number; // 총 시간 지연 (년)
  isComplete: boolean; // 모든 파라미터 입력 여부
}

export interface AggregateImpact {
  totalImpact: number | null;
  sigma: number | null;
  ci95: [number, number] | null;
  validChains: number;
  incompleteChains: number;
  perChain: ChainImpact[];
}

// --- 뉴스 ---

export interface NewsArticle {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  source: string;
}
