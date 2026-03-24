import type { Node, Edge } from "@xyflow/react";
import type { CausalChain, CausalNode, CausalEdge } from "@/lib/types/causal";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const COL_WIDTH = 200;
const ROW_HEIGHT = 100;
const FINAL_NODE_EXTRA_GAP = 30;

// ---------------------------------------------------------------------------
// Node type mapping
// ---------------------------------------------------------------------------

function toFlowNodeType(nodeType: CausalNode["type"]): string {
  switch (nodeType) {
    case "event":
      return "eventNode";
    case "numeric":
      return "numericNode";
    case "final":
      return "finalNode";
    default:
      return "default";
  }
}

// ---------------------------------------------------------------------------
// Check if a node is the first (root) node in its chain
// ---------------------------------------------------------------------------

function isRootNode(node: CausalNode, edges: CausalEdge[]): boolean {
  return !edges.some((e) => e.to === node.id);
}

// ---------------------------------------------------------------------------
// Main conversion function
// ---------------------------------------------------------------------------

export function chainsToFlowData(
  chains: CausalChain[],
  targetLabel: string
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const addedNodeIds = new Set<string>();

  // 최종 노드: 가장 긴 체인의 마지막 노드 바로 오른쪽에 배치
  const maxChainLength = Math.max(...chains.map((c) => c.nodes.length), 0);
  const lastNodeX = (maxChainLength - 1) * COL_WIDTH;
  const finalNodeX = lastNodeX + COL_WIDTH * 0.85 + FINAL_NODE_EXTRA_GAP;

  // Add the final (target) node at far right, centered vertically
  const finalNodeId = "__final__";
  const finalNodeY =
    chains.length > 0 ? ((chains.length - 1) * ROW_HEIGHT) / 2 : 0;

  nodes.push({
    id: finalNodeId,
    type: "finalNode",
    position: { x: finalNodeX, y: finalNodeY },
    data: {
      label: targetLabel,
      totalImpact: null,
    },
  });

  // Process each chain
  chains.forEach((chain, chainIndex) => {
    const y = chainIndex * ROW_HEIGHT;

    // Add nodes
    chain.nodes.forEach((node, nodeIndex) => {
      if (addedNodeIds.has(node.id)) return;
      addedNodeIds.add(node.id);

      nodes.push({
        id: node.id,
        type: toFlowNodeType(node.type),
        position: { x: nodeIndex * COL_WIDTH, y },
        data: {
          label: node.label,
          description: node.description ?? "",
          chainColor: chain.color,
          chainId: chain.id,
          isRoot: isRootNode(node, chain.edges),
        },
      });
    });

    // Add edges within the chain
    chain.edges.forEach((edge) => {
      edges.push({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "causalEdge",
        data: {
          edgeType: edge.edgeType,
          params: edge.params,
          confidence: edge.confidence,
          chainColor: chain.color,
          chainId: chain.id,
          timeLag: edge.timeLag,
        },
      });
    });

    // Connect last node of chain to the final node
    if (chain.nodes.length > 0) {
      const lastNode = chain.nodes[chain.nodes.length - 1];
      const connectEdgeId = `${lastNode.id}->final`;

      // Only add if not already present
      if (!edges.some((e) => e.id === connectEdgeId)) {
        edges.push({
          id: connectEdgeId,
          source: lastNode.id,
          target: finalNodeId,
          type: "causalEdge",
          data: {
            edgeType: "numeric-numeric" as const,
            params: {},
            confidence: "medium" as const,
            chainColor: chain.color,
            chainId: chain.id,
            timeLag: 0,
            isFinalConnector: true,
          },
        });
      }
    }
  });

  return { nodes, edges };
}
