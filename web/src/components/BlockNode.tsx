import { useContext } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { BlockNodeData } from './layout';
import { HoverContext } from './hover';

type Props = NodeProps<Node<BlockNodeData>>;

export default function BlockNode({ data }: Props) {
  const { hovered, pinned } = useContext(HoverContext);
  const classes = ['block-node'];
  if (data.isEntry) classes.push('entry');
  if (data.isTerminal) classes.push('terminal');
  if (!data.live) classes.push('dead');
  if (data.index === hovered) classes.push('highlighted');
  if (data.index === pinned) classes.push('pinned');

  return (
    <div className={classes.join(' ')}>
      <Handle type="target" position={Position.Top} style={{ background: '#7d8590' }} />
      <div className="head">
        <span className="idx">Block {data.index}</span>
        <span className="kind">{data.kind}</span>
      </div>
      <div className="body">
        {data.preview && <span className="stmt">{data.preview}</span>}
        <div>
          {data.nodeCount} node{data.nodeCount === 1 ? '' : 's'}
          {data.isTerminal && ' · terminal'}
          {!data.live && ' · dead'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#7d8590' }} />
    </div>
  );
}
