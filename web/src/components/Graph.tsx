import { useCallback, useMemo, useRef, useState } from 'react';
import { Background, Controls, MiniMap, Panel, ReactFlow } from '@xyflow/react';
import type { Node as FlowNode, NodeMouseHandler, ReactFlowInstance } from '@xyflow/react';
import { toPng } from 'html-to-image';
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
  theme: 'dark' | 'light';
  onHover: (index: number | null) => void;
  onClick: (index: number) => void;
};

// Theme-dependent colors for the parts of react-flow that are drawn to canvas/
// SVG and therefore can't pick up CSS variables.
const THEME = {
  dark: { dots: '#2a2f3a', miniBg: '#0f1115', miniMask: 'rgba(15,17,21,0.6)', miniNode: '#30363d' },
  light: { dots: '#c9ced6', miniBg: '#ffffff', miniMask: 'rgba(255,255,255,0.6)', miniNode: '#c9ced6' },
} as const;

export default function Graph({
  fn,
  hoveredBlock,
  pinnedBlock,
  showUnreachable,
  theme,
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

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rfRef = useRef<ReactFlowInstance<FlowNode<BlockNodeData>> | null>(null);
  const [copied, setCopied] = useState(false);
  const colors = THEME[theme];

  const handleEnter: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    if (node.data.index !== hoveredBlock) onHover(node.data.index);
  };
  const handleClick: NodeMouseHandler<FlowNode<BlockNodeData>> = (_, node) => {
    onClick(node.data.index);
  };

  const onCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(fn, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }, [fn]);

  // Export the graph to a PNG. Let react-flow fit the whole graph into the
  // current container (its fitView uses measured node sizes, which the manual
  // bounds utilities don't expose reliably), snapshot it, then restore the
  // user's prior view.
  const onExportPng = useCallback(() => {
    const instance = rfRef.current;
    const wrap = wrapperRef.current;
    const viewport = wrap?.querySelector('.react-flow__viewport') as HTMLElement | null;
    if (!instance || !wrap || !viewport) return;
    const prev = instance.getViewport();
    instance.fitView({ padding: 0.15 });
    const rect = wrap.getBoundingClientRect();
    const bg =
      getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0f1115';
    // Wait one frame for the fitted transform to apply before snapshotting.
    requestAnimationFrame(() => {
      const { x, y, zoom } = instance.getViewport();
      toPng(viewport, {
        backgroundColor: bg,
        width: rect.width,
        height: rect.height,
        pixelRatio: 2,
        style: {
          width: `${rect.width}px`,
          height: `${rect.height}px`,
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
        },
      })
        .then((dataUrl) => {
          const a = document.createElement('a');
          a.download = `${fn.name || 'cfg'}.png`;
          a.href = dataUrl;
          a.click();
        })
        .catch(() => {})
        .finally(() => instance.setViewport(prev));
    });
  }, [fn.name]);

  return (
    <div className="graph" ref={wrapperRef} onMouseLeave={() => onHover(null)}>
      <HoverContext.Provider value={hoverState}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            rfRef.current = instance;
          }}
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
          <Background gap={16} size={1} color={colors.dots} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            bgColor={colors.miniBg}
            maskColor={colors.miniMask}
            nodeStrokeColor={colors.dots}
            nodeColor={(n) => {
              const d = n.data as BlockNodeData;
              if (d.isEntry) return '#3fb950';
              if (d.isTerminal) return '#f85149';
              if (!d.live) return '#d29922';
              return colors.miniNode;
            }}
          />
          <Panel position="top-right" className="export-panel">
            <button className="ghost-btn" onClick={onCopyJson} title="Copy this function's CFG as JSON">
              {copied ? 'Copied!' : 'JSON'}
            </button>
            <button className="ghost-btn" onClick={onExportPng} title="Download the graph as a PNG">
              PNG
            </button>
          </Panel>
        </ReactFlow>
      </HoverContext.Provider>
    </div>
  );
}