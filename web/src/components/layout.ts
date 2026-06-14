import dagre from 'dagre';
import type { Edge as FlowEdge, Node as FlowNode } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { Func } from '../types';

export type BlockNodeData = {
  index: number;
  kind: string;
  live: boolean;
  isEntry: boolean;
  isTerminal: boolean;
  preview?: string;
  nodeCount: number;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;

const EDGE_COLORS: Record<string, string> = {
  true: '#3fb950',
  false: '#f85149',
};
const EDGE_DEFAULT = '#7d8590';

export function layoutFunction(fn: Func): {
  nodes: FlowNode<BlockNodeData>[];
  edges: FlowEdge[];
} {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const b of fn.blocks) {
    g.setNode(String(b.index), { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const b of fn.blocks) {
    for (const e of b.succs) {
      g.setEdge(String(b.index), String(e.to));
    }
  }

  dagre.layout(g);

  const nodes: FlowNode<BlockNodeData>[] = fn.blocks.map((b) => {
    const pos = g.node(String(b.index));
    return {
      id: String(b.index),
      type: 'block',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: {
        index: b.index,
        kind: b.kind,
        live: b.live,
        // cfg's entry block is the one with Index 0; there is no canonical
        // exit, so we mark every block with no successors as terminal.
        isEntry: b.index === 0,
        isTerminal: b.succs.length === 0,
        // Show the block's own first node, not the governing statement.
        // cfg assigns the same governing stmt to every block born from the
        // same `if`/`for`/`switch`, which makes distinct blocks look like
        // duplicates of each other.
        preview: b.nodes[0]?.text.split('\n')[0],
        nodeCount: b.nodes.length,
      },
      draggable: false,
      selectable: false,
    };
  });

  const edges: FlowEdge[] = [];
  for (const b of fn.blocks) {
    for (const e of b.succs) {
      const color = (e.label && EDGE_COLORS[e.label]) || EDGE_DEFAULT;
      edges.push({
        id: `${b.index}->${e.to}:${e.label ?? ''}`,
        source: String(b.index),
        target: String(e.to),
        label: e.label,
        labelStyle: { fill: color, fontFamily: 'var(--code)', fontSize: 11 },
        labelBgStyle: { fill: 'var(--bg)' },
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
      });
    }
  }

  return { nodes, edges };
}
