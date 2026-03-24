"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
} from "@xyflow/react";
import type { Node, Edge, NodeMouseHandler } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useCausalStore } from "@/lib/store/causal-store";
import { chainsToFlowData } from "@/lib/utils/graph-layout";
import { calcAggregateImpact } from "@/lib/utils/impact-calc";

import EventNode from "./nodes/EventNode";
import NumericNode from "./nodes/NumericNode";
import FinalNode from "./nodes/FinalNode";
import CausalEdge from "./edges/CausalEdge";

const nodeTypes = {
  eventNode: EventNode,
  numericNode: NumericNode,
  finalNode: FinalNode,
};

const edgeTypes = {
  causalEdge: CausalEdge,
};

const proOptions = { hideAttribution: true };
const defaultViewport = { x: 40, y: 60, zoom: 0.85 };

export default function CausalGraph() {
  const project = useCausalStore((s) => s.project);
  const selectEdge = useCausalStore((s) => s.selectEdge);
  const hoverChain = useCausalStore((s) => s.hoverChain);
  const hoveredChainId = useCausalStore((s) => s.hoveredChainId);

  // 영향도 계산 (파라미터 변경 시 실시간 재계산)
  const aggregate = useMemo(() => {
    if (!project || project.chains.length === 0) return null;
    return calcAggregateImpact(project.chains);
  }, [project]);

  // Convert chains to React Flow data + totalImpact 주입
  const flowData = useMemo(() => {
    if (!project || project.chains.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }
    const data = chainsToFlowData(
      project.chains,
      project.targetAsset ?? "타겟 자산"
    );
    // FinalNode에 totalImpact 주입
    const finalNode = data.nodes.find((n) => n.id === "__final__");
    if (finalNode && aggregate) {
      finalNode.data = { ...finalNode.data, totalImpact: aggregate.totalImpact };
    }
    return data;
  }, [project, aggregate]);

  // Apply hover dimming
  const styledNodes = useMemo(() => {
    if (!hoveredChainId) return flowData.nodes;
    return flowData.nodes.map((node) => {
      const nodeChainId = node.data?.chainId as string | undefined;
      if (node.id === "__final__" || !nodeChainId) return node;
      const isActive = nodeChainId === hoveredChainId;
      return {
        ...node,
        style: {
          ...node.style,
          opacity: isActive ? 1 : 0.3,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [flowData.nodes, hoveredChainId]);

  const styledEdges = useMemo(() => {
    if (!hoveredChainId) return flowData.edges;
    return flowData.edges.map((edge) => {
      const edgeChainId = edge.data?.chainId as string | undefined;
      const isActive = edgeChainId === hoveredChainId;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isActive ? 1 : 0.15,
          transition: "opacity 0.2s ease",
        },
      };
    });
  }, [flowData.edges, hoveredChainId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(styledNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(styledEdges);

  // Sync when styledNodes/styledEdges change
  useMemo(() => {
    setNodes(styledNodes);
  }, [styledNodes, setNodes]);

  useMemo(() => {
    setEdges(styledEdges);
  }, [styledEdges, setEdges]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge]
  );

  // 노드 클릭 → 해당 노드가 source인 첫 번째 엣지 선택
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id === "__final__") return;
      const relatedEdge = edges.find(
        (e) => e.source === node.id || e.target === node.id
      );
      if (relatedEdge) selectEdge(relatedEdge.id);
    },
    [edges, selectEdge]
  );

  const onNodeMouseEnter: NodeMouseHandler = useCallback(
    (_event, node) => {
      const chainId = node.data?.chainId as string | undefined;
      if (chainId) hoverChain(chainId);
    },
    [hoverChain]
  );

  const onNodeMouseLeave: NodeMouseHandler = useCallback(
    () => {
      hoverChain(null);
    },
    [hoverChain]
  );

  if (!project || project.chains.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-dim">인과 체인을 생성하면 그래프가 표시됩니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={proOptions}
        defaultViewport={defaultViewport}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2.5}
        colorMode="dark"
      >
        {/* 신뢰도별 화살표 마커 */}
        <svg>
          <defs>
            {[
              { id: "marker-high", color: "var(--green)" },
              { id: "marker-medium", color: "var(--yellow)" },
              { id: "marker-low", color: "var(--red)" },
            ].map(({ id, color }) => (
              <marker key={id} id={id} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6 Z" fill={color} />
              </marker>
            ))}
          </defs>
        </svg>
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={0.8}
          color="var(--tooltip-bg)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            const color = node.data?.chainColor as string | undefined;
            return color ?? "var(--accent)";
          }}
          maskColor="rgba(15, 17, 21, 0.7)"
          style={{
            backgroundColor: "var(--panel)",
            border: "1px solid var(--border)",
          }}
        />
      </ReactFlow>
    </div>
  );
}
