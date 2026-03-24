import { create } from "zustand";
import type {
  CausalProject,
  CausalChain,
  CausalEdge,
  EdgeParams,
  ChainImpact,
  AggregateImpact,
  NewsArticle,
} from "@/lib/types/causal";

interface CausalState {
  // --- 프로젝트 ---
  project: CausalProject | null;

  // --- UI 상태 ---
  selectedEdgeId: string | null;
  hoveredChainId: string | null;
  isGenerating: boolean;
  isEstimating: boolean;

  // --- 뉴스 ---
  newsArticles: NewsArticle[];
  selectedArticles: NewsArticle[];

  // --- 영향도 ---
  chainImpacts: ChainImpact[];
  aggregateImpact: AggregateImpact | null;

  // --- 액션: 프로젝트 ---
  setProject: (project: CausalProject) => void;
  addChain: (chain: CausalChain) => void;
  removeChain: (chainId: string) => void;

  // --- 액션: 엣지 파라미터 ---
  updateEdgeParams: (edgeId: string, params: Partial<EdgeParams>) => void;
  updateEdge: (edgeId: string, updates: Partial<CausalEdge>) => void;

  // --- 액션: UI ---
  selectEdge: (edgeId: string | null) => void;
  hoverChain: (chainId: string | null) => void;
  setGenerating: (v: boolean) => void;
  setEstimating: (v: boolean) => void;

  // --- 액션: 뉴스 ---
  setNewsArticles: (articles: NewsArticle[]) => void;
  toggleArticleSelection: (article: NewsArticle) => void;

  // --- 액션: 영향도 ---
  setChainImpacts: (impacts: ChainImpact[]) => void;
  setAggregateImpact: (impact: AggregateImpact | null) => void;

  // --- 유틸 ---
  getAllEdges: () => CausalEdge[];
  getEdgeById: (id: string) => CausalEdge | undefined;
  getNullParamCount: () => number;
}

export const useCausalStore = create<CausalState>((set, get) => ({
  // --- 초기 상태 ---
  project: null,
  selectedEdgeId: null,
  hoveredChainId: null,
  isGenerating: false,
  isEstimating: false,
  newsArticles: [],
  selectedArticles: [],
  chainImpacts: [],
  aggregateImpact: null,

  // --- 프로젝트 ---
  setProject: (project) => set({ project }),

  addChain: (chain) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          chains: [...s.project.chains, chain],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  removeChain: (chainId) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          chains: s.project.chains.filter((c) => c.id !== chainId),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // --- 엣지 파라미터 ---
  updateEdgeParams: (edgeId, params) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          chains: s.project.chains.map((chain) => ({
            ...chain,
            edges: chain.edges.map((edge) =>
              edge.id === edgeId
                ? {
                    ...edge,
                    params: { ...edge.params, ...params },
                    paramMeta: {
                      ...edge.paramMeta,
                      ...Object.fromEntries(
                        Object.keys(params).map((k) => [
                          k,
                          { status: "manual" as const, method: "사용자 직접 입력" },
                        ])
                      ),
                    },
                  }
                : edge
            ),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateEdge: (edgeId, updates) =>
    set((s) => {
      if (!s.project) return s;
      return {
        project: {
          ...s.project,
          chains: s.project.chains.map((chain) => ({
            ...chain,
            edges: chain.edges.map((edge) =>
              edge.id === edgeId ? { ...edge, ...updates } : edge
            ),
          })),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  // --- UI ---
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
  hoverChain: (chainId) => set({ hoveredChainId: chainId }),
  setGenerating: (v) => set({ isGenerating: v }),
  setEstimating: (v) => set({ isEstimating: v }),

  // --- 뉴스 ---
  setNewsArticles: (articles) => set({ newsArticles: articles }),
  toggleArticleSelection: (article) =>
    set((s) => {
      const exists = s.selectedArticles.some((a) => a.url === article.url);
      return {
        selectedArticles: exists
          ? s.selectedArticles.filter((a) => a.url !== article.url)
          : [...s.selectedArticles, article],
      };
    }),

  // --- 영향도 ---
  setChainImpacts: (impacts) => set({ chainImpacts: impacts }),
  setAggregateImpact: (impact) => set({ aggregateImpact: impact }),

  // --- 유틸 ---
  getAllEdges: () => {
    const { project } = get();
    if (!project) return [];
    return project.chains.flatMap((c) => c.edges);
  },

  getEdgeById: (id) => {
    return get().getAllEdges().find((e) => e.id === id);
  },

  getNullParamCount: () => {
    const edges = get().getAllEdges();
    let count = 0;
    for (const edge of edges) {
      for (const val of Object.values(edge.params)) {
        if (val === null || val === undefined) count++;
      }
    }
    return count;
  },
}));
