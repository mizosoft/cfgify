import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { BlockNodeData } from './layout';

type Props = NodeProps<Node<BlockNodeData>>;

export default function BlockNode({ data }: Props) {
  const classes = ['block-node'];
  if (data.isEntry) classes.push('entry');
  if (data.isExit) classes.push('exit');
  if (!data.live) classes.push('dead');
  if (data.highlighted) classes.push('highlighted');
  if (data.pinned) classes.push('pinned');

  return (
    <div className={classes.join(' ')}>
      <Handle type="target" position={Position.Top} style={{ background: '#7d8590' }} />
      <div className="head">
        <span className="idx">Block {data.index}</span>
        <span className="kind">{data.kind}</span>
      </div>
      <div className="body">
        {data.governing && <span className="stmt">{data.governing}</span>}
        <div>
          {data.nodeCount} node{data.nodeCount === 1 ? '' : 's'}
          {!data.live && ' · dead'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#7d8590' }} />
    </div>
  );
}