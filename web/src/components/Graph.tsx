import { useMemo } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Node as FlowNode, NodeMouseHandler } from '@xyflow/react';
import type { Func } from '../types';
import { layoutFunction, type BlockNodeData } from './layout';
import BlockNode from './BlockNode';

const nodeTypes = { block: BlockNode };

type Props = {
  fn: Func;
  hoveredBlock: number | null;
  pinnedBlock: number | null;
  onHover: (index: number | null) => void;
  onClick: (index: number) => void;
};

export default function Graph({ fn, hoveredBlock, pinnedBlock, onHover, onClick }: Props) {
  const base = useMemo(() => layoutFunction(fn), [fn]);

  const nodes = useMemo(
    () =>
      base.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          highlighted: n.data.index === hoveredBlock,
          pinned: n.data.index === pinnedBlock,
        },
      })),
    [base.nodes, hoveredBlock, pinnedBlock],
  );

  const handleEnter: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    onHover(node.data.index);
  };
  const handleLeave: NodeMouseHandler<FlowNode<BlockNodeData>> = () => {
    onHover(null);
  };
  const handleClick: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    onClick(node.data.index);
  };

  return (
    <div className="graph">
      <ReactFlow
        nodes={nodes}
        edges={base.edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onNodeMouseEnter={handleEnter}
        onNodeMouseLeave={handleLeave}
        onNodeClick={handleClick}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#2a2f3a" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable maskColor="rgba(15,17,21,0.7)" />
      </ReactFlow>
    </div>
  );
}
