import { useMemo } from 'react';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { Node as FlowNode, NodeMouseHandler } from '@xyflow/react';
import type { Func } from '../types';
import { layoutFunction, type BlockNodeData } from './layout';
import BlockNode from './BlockNode';
import { HoverContext } from './hover';

const nodeTypes = { block: BlockNode };

type Props = {
  fn: Func;
  hoveredBlock: number | null;
  pinnedBlock: number | null;
  showUnreachable: boolean;
  onHover: (index: number | null) => void;
  onClick: (index: number) => void;
};

export default function Graph({
  fn,
  hoveredBlock,
  pinnedBlock,
  showUnreachable,
  onHover,
  onClick,
}: Props) {
  // The nodes array only changes when the function or the visibility toggle
  // changes. Hover/pinned state goes through HoverContext so block-level
  // highlight updates don't re-render the ReactFlow node tree (which
  // previously caused flicker as mouseenter/leave events fought during
  // re-renders).
  const { nodes, edges } = useMemo(
    () => layoutFunction(fn, { hideUnreachable: !showUnreachable }),
    [fn, showUnreachable],
  );
  const hoverState = useMemo(
    () => ({ hovered: hoveredBlock, pinned: pinnedBlock }),
    [hoveredBlock, pinnedBlock],
  );

  const handleEnter: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    if (node.data.index !== hoveredBlock) onHover(node.data.index);
  };
  const handleClick: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    onClick(node.data.index);
  };

  return (
    <div className="graph" onMouseLeave={() => onHover(null)}>
      <HoverContext.Provider value={hoverState}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          onNodeMouseEnter={handleEnter}
          onNodeClick={handleClick}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="#2a2f3a" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            bgColor="#0f1115"
            maskColor="rgba(15,17,21,0.6)"
            nodeStrokeColor="#2a2f3a"
            nodeColor={(n) => {
              const d = n.data as BlockNodeData;
              if (d.isEntry) return '#3fb950';
              if (d.isTerminal) return '#f85149';
              if (!d.live) return '#d29922';
              return '#30363d';
            }}
          />
        </ReactFlow>
      </HoverContext.Provider>
    </div>
  );
}
