import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { type EditorHandle } from './components/Editor';
import Graph from './components/Graph';
import FunctionTabs from './components/FunctionTabs';
import BlockPanel from './components/BlockPanel';
import SplitPane from './components/SplitPane';
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
  | { kind: 'editing' }
  | { kind: 'loading' }
  | { kind: 'ok'; text: string }
  | { kind: 'err'; text: string };

type Pin = { functionIndex: number; blockIndex: number };

// How long the source must be idle (no keystrokes) before we re-analyze.
const ANALYZE_DEBOUNCE_MS = 400;

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

  // Monotonic id for analyze requests. Each call captures its id locally so
  // a slow in-flight request whose response arrives after a newer one was
  // dispatched is dropped instead of overwriting fresher state.
  const reqIdRef = useRef(0);
  // Whether this is the first effect run; we analyze immediately on mount
  // instead of after a debounce delay.
  const isFirstRun = useRef(true);

  const performAnalyze = useCallback(async (src: string) => {
    const id = ++reqIdRef.current;
    setStatus({ kind: 'loading' });
    try {
      const r = await analyze('go', src);
      if (reqIdRef.current !== id) return;
      setResult(r);
      setHovered(null);
      setPinned(null);
      // Preserve the function tab the user was on if it's still valid;
      // otherwise fall back to the first function.
      setActiveFn((prev) => (prev < r.functions.length ? prev : 0));
      const n = r.functions.length;
      setStatus({ kind: 'ok', text: `${n} function${n === 1 ? '' : 's'}` });
    } catch (e) {
      if (reqIdRef.current !== id) return;
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  // Auto-analyze: immediately on mount, debounced on each source change.
  useEffect(() => {
    const first = isFirstRun.current;
    isFirstRun.current = false;
    if (!first) setStatus({ kind: 'editing' });
    const timer = window.setTimeout(
      () => performAnalyze(source),
      first ? 0 : ANALYZE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [source, performAnalyze]);

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

  // Force an immediate re-analyze on ⌘/Ctrl+Enter (bypasses the debounce).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        performAnalyze(source);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [performAnalyze, source]);

  const hiddenCount = fn && !showUnreachable ? fn.blocks.filter((b) => !b.live).length : 0;

  const pinnedBlock =
    pinned && pinned.functionIndex === activeFn ? findBlock(fn!, pinned.blockIndex) : undefined;
  const pinnedHiddenByFilter = !!pinnedBlock && !showUnreachable && !pinnedBlock.live;
  const panelVisible = !!pinnedBlock && !pinnedHiddenByFilter;

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <svg className="logo" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="12" cy="4" r="2.4" />
            <circle cx="5" cy="19" r="2.4" />
            <circle cx="19" cy="19" r="2.4" />
            <path d="M12 6.4 L6 16.6 M12 6.4 L18 16.6" />
          </svg>
          <h1>cfgify</h1>
        </div>
        <span className="tag">control-flow graph visualizer</span>
        <span className="hint">
          <kbd>⌘/Ctrl</kbd>
          <kbd>Enter</kbd>
          to re-analyze
        </span>
      </header>
      <main className="app-main">
        <SplitPane
          storageKey="cfgify.split"
          left={
            <section className="panel">
              <div className="panel-header">
                <span>Source</span>
                <StatusPill status={status} />
              </div>
              <div className="panel-body">
                <Editor
                  ref={editorRef}
                  value={source}
                  onChange={setSource}
                  onCursorChange={onCursorChange}
                  highlight={editorHighlight}
                />
              </div>
            </section>
          }
          right={
            <section className="panel">
              <div className="panel-header">
                <span>Control-flow graph</span>
                <div className="header-actions">
                  <Legend />
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
                  <div className="empty">
                    {status.kind === 'err'
                      ? 'Fix the error above to render the CFG.'
                      : 'Write a function to see its control-flow graph.'}
                  </div>
                )}
              </div>
            </section>
          }
        />
      </main>
    </div>
  );
}

// A compact status indicator: a colored dot (pulsing while editing/analyzing)
// plus a short label. Mirrors the Status union in this file.
function StatusPill({ status }: { status: Status }) {
  const text =
    status.kind === 'idle'
      ? 'idle'
      : status.kind === 'editing'
        ? 'editing…'
        : status.kind === 'loading'
          ? 'analyzing…'
          : status.text;
  return (
    <span
      className={`status-pill ${status.kind}`}
      title={status.kind === 'err' ? text : undefined}
    >
      <span className="dot" />
      <span className="label">{text}</span>
    </span>
  );
}

// Colour key for the graph's node borders.
function Legend() {
  return (
    <span className="legend" aria-hidden="true">
      <span className="legend-item">
        <span className="swatch entry" />
        entry
      </span>
      <span className="legend-item">
        <span className="swatch terminal" />
        terminal
      </span>
      <span className="legend-item">
        <span className="swatch dead" />
        unreachable
      </span>
    </span>
  );
}
