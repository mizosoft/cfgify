import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type EditorHandle } from './components/Editor';
import Graph from './components/Graph';
import FunctionTabs from './components/FunctionTabs';
import BlockPanel from './components/BlockPanel';
import { analyze } from './api';
import { blockRange, findBlock, findBlockAt, findFunctionAt } from './cfg';
import type { AnalyzeResult } from './types';

const DEFAULT_SOURCE = `package sample

import "fmt"

func EarlyReturn(x int) int {
\tif x < 0 {
\t\treturn -1
\t}
\tif x == 0 {
\t\treturn 0
\t}
\tfmt.Println(x)
\treturn 1
}
`;

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; text: string }
  | { kind: 'err'; text: string };

type Pin = { functionIndex: number; blockIndex: number };

export default function App() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [activeFn, setActiveFn] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  // Hovered block index (in activeFn). Driven by editor cursor and graph hover;
  // last interaction wins. Cleared when the cursor leaves any block.
  const [hovered, setHovered] = useState<number | null>(null);

  // Pinned block from a graph click; opens the details panel.
  const [pinned, setPinned] = useState<Pin | null>(null);

  // Whether to show cfg's unreachable (Live=false) blocks. Off by default
  // because cfg emits synthetic bookkeeping blocks after every terminator,
  // which clutters the view without representing executable code.
  const [showUnreachable, setShowUnreachable] = useState(false);

  const editorRef = useRef<EditorHandle | null>(null);

  const onAnalyze = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      const r = await analyze('go', source);
      setResult(r);
      setActiveFn(0);
      setHovered(null);
      setPinned(null);
      const n = r.functions.length;
      setStatus({ kind: 'ok', text: `${n} function${n === 1 ? '' : 's'}` });
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  }, [source]);

  // Editor cursor → block highlight (+ auto-switch function tab).
  const onCursorChange = useCallback(
    (offset: number) => {
      if (!result) return;
      const fnIdx = findFunctionAt(result.functions, offset);
      if (fnIdx === null) {
        setHovered(null);
        return;
      }
      const blockIdx = findBlockAt(result.functions[fnIdx], offset);
      if (fnIdx !== activeFn) setActiveFn(fnIdx);
      setHovered(blockIdx);
    },
    [result, activeFn],
  );

  // Graph hover → block highlight.
  const onGraphHover = useCallback((index: number | null) => {
    setHovered(index);
  }, []);

  // Graph click → pin selection, open details, scroll editor to range.
  const onGraphClick = useCallback(
    (index: number) => {
      if (!result) return;
      const fn = result.functions[activeFn];
      const block = findBlock(fn, index);
      if (!block) return;
      setPinned({ functionIndex: activeFn, blockIndex: index });
      const r = blockRange(block);
      if (r) editorRef.current?.scrollTo(r.startOffset, r.endOffset);
    },
    [result, activeFn],
  );

  // Switching tabs manually clears hover; pinned panel hides if it's for
  // another function but reappears when the user returns to that tab.
  const onSelectTab = useCallback((index: number) => {
    setActiveFn(index);
    setHovered(null);
  }, []);

  const fn = result?.functions[activeFn];

  // Compute editor decoration range for the hovered block (or pinned block
  // in the active function when nothing is hovered).
  const editorHighlight = useMemo(() => {
    if (!fn) return null;
    const candidate =
      hovered !== null
        ? hovered
        : pinned && pinned.functionIndex === activeFn
          ? pinned.blockIndex
          : null;
    if (candidate === null) return null;
    const block = findBlock(fn, candidate);
    if (!block) return null;
    const r = blockRange(block);
    if (!r) return null;
    return { from: r.startOffset, to: r.endOffset };
  }, [fn, hovered, pinned, activeFn]);

  // Re-analyze on Ctrl/Cmd+Enter anywhere on the page.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onAnalyze();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAnalyze]);

  const hiddenCount = fn && !showUnreachable ? fn.blocks.filter((b) => !b.live).length : 0;

  const pinnedBlock =
    pinned && pinned.functionIndex === activeFn ? findBlock(fn!, pinned.blockIndex) : undefined;
  const pinnedHiddenByFilter = !!pinnedBlock && !showUnreachable && !pinnedBlock.live;
  const panelVisible = !!pinnedBlock && !pinnedHiddenByFilter;

  return (
    <div className="app">
      <header className="app-header">
        <h1>cfgify</h1>
        <span className="tag">control-flow graph visualizer</span>
        <span className="tag dim">⌘/Ctrl+Enter to analyze</span>
      </header>
      <main className="app-main">
        <section className="panel">
          <div className="panel-header">
            <span>Source</span>
            <span>go</span>
          </div>
          <div className="panel-body">
            <Editor
              ref={editorRef}
              value={source}
              onChange={setSource}
              onCursorChange={onCursorChange}
              highlight={editorHighlight}
            />
            <div className="toolbar">
              <button
                className="primary"
                onClick={onAnalyze}
                disabled={status.kind === 'loading'}
              >
                Analyze
              </button>
              <span className={`status ${status.kind === 'err' ? 'err' : ''}`}>
                {status.kind === 'idle' && 'idle'}
                {status.kind === 'loading' && 'analyzing…'}
                {status.kind === 'ok' && status.text}
                {status.kind === 'err' && status.text}
              </span>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span>Control-flow graph</span>
            <div className="header-actions">
              <label className="toggle" title="Show cfg's unreachable bookkeeping blocks">
                <input
                  type="checkbox"
                  checked={showUnreachable}
                  onChange={(e) => setShowUnreachable(e.target.checked)}
                />
                <span>Show unreachable</span>
              </label>
              {fn && (
                <span className="muted">
                  {fn.blocks.length} blocks
                  {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
                </span>
              )}
            </div>
          </div>
          <div className="panel-body">
            {result && (
              <FunctionTabs
                functions={result.functions}
                active={activeFn}
                onSelect={onSelectTab}
              />
            )}
            {fn ? (
              <div className="graph-and-panel">
                <Graph
                  fn={fn}
                  hoveredBlock={hovered}
                  pinnedBlock={
                    pinned && pinned.functionIndex === activeFn ? pinned.blockIndex : null
                  }
                  showUnreachable={showUnreachable}
                  onHover={onGraphHover}
                  onClick={onGraphClick}
                />
                {panelVisible && (
                  <BlockPanel
                    fn={fn}
                    blockIndex={pinned!.blockIndex}
                    onClose={() => setPinned(null)}
                    onJumpToBlock={(i) => onGraphClick(i)}
                  />
                )}
              </div>
            ) : (
              <div className="empty">Click Analyze to render the CFG.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
