import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import type { Func } from '../types';
import { layoutFunction } from './layout';
import BlockNode from './BlockNode';

const nodeTypes = { block: BlockNode };

type Props = { fn: Func };

export default function Graph({ fn }: Props) {
  const { nodes, edges } = useMemo(() => layoutFunction(fn), [fn]);
  return (
    <div className="graph">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#2a2f3a" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable maskColor="rgba(15,17,21,0.7)" />
      </ReactFlow>
    </div>
  );
}