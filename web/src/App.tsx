import { useState } from 'react';
import Editor from './components/Editor';
import Graph from './components/Graph';
import FunctionTabs from './components/FunctionTabs';
import { analyze } from './api';
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

export default function App() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [activeFn, setActiveFn] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const onAnalyze = async () => {
    setStatus({ kind: 'loading' });
    try {
      const r = await analyze('go', source);
      setResult(r);
      setActiveFn(0);
      const n = r.functions.length;
      setStatus({ kind: 'ok', text: `${n} function${n === 1 ? '' : 's'}` });
    } catch (e) {
      setStatus({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const fn = result?.functions[activeFn];

  return (
    <div className="app">
      <header className="app-header">
        <h1>cfgify</h1>
        <span className="tag">control-flow graph visualizer</span>
      </header>
      <main className="app-main">
        <section className="panel">
          <div className="panel-header">
            <span>Source</span>
            <span>go</span>
          </div>
          <div className="panel-body">
            <Editor value={source} onChange={setSource} />
            <div className="toolbar">
              <button
                className="primary"
                onClick={onAnalyze}
                disabled={status.kind === 'loading'}
              >
                Analyze
              </button>
              <span
                className={`status ${status.kind === 'err' ? 'err' : ''}`}
              >
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
            {fn && <span>{fn.blocks.length} blocks</span>}
          </div>
          <div className="panel-body">
            {result && (
              <FunctionTabs
                functions={result.functions}
                active={activeFn}
                onSelect={setActiveFn}
              />
            )}
            {fn ? (
              <Graph fn={fn} />
            ) : (
              <div className="empty">Click Analyze to render the CFG.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}