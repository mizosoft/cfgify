import type { Func } from '../types';
import { findBlock, predsOf } from '../cfg';

type Props = {
  fn: Func;
  blockIndex: number;
  onClose: () => void;
  onJumpToBlock: (index: number) => void;
};

export default function BlockPanel({ fn, blockIndex, onClose, onJumpToBlock }: Props) {
  const block = findBlock(fn, blockIndex);
  if (!block) return null;
  const preds = predsOf(fn, blockIndex);

  return (
    <aside className="block-panel">
      <header>
        <span className="title">
          <span className="idx">Block {block.index}</span>
          <span className="kind">{block.kind}</span>
          {!block.live && <span className="badge dead">DEAD</span>}
        </span>
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div className="body">
        <Row label="preds">
          {preds.length === 0 ? (
            <span className="muted">(none)</span>
          ) : (
            preds.map((p, i) => (
              <span key={p}>
                <button className="link" onClick={() => onJumpToBlock(p)}>
                  Block {p}
                </button>
                {i < preds.length - 1 && ', '}
              </span>
            ))
          )}
        </Row>

        <Row label="succs">
          {block.succs.length === 0 ? (
            <span className="muted">(terminal)</span>
          ) : (
            block.succs.map((s, i) => (
              <span key={`${s.to}-${i}`}>
                <button className="link" onClick={() => onJumpToBlock(s.to)}>
                  Block {s.to}
                </button>
                {s.label && <span className={`edge-label ${s.label}`}> {s.label}</span>}
                {i < block.succs.length - 1 && ', '}
              </span>
            ))
          )}
        </Row>

        {block.governing && (
          <div className="section">
            <div className="label">governing</div>
            <pre className="code">{block.governing.text}</pre>
            <div className="pos">
              line {block.governing.range.startLine}:{block.governing.range.startCol}
            </div>
          </div>
        )}

        <div className="section">
          <div className="label">
            nodes <span className="muted">({block.nodes.length})</span>
          </div>
          {block.nodes.length === 0 ? (
            <div className="muted">(empty)</div>
          ) : (
            <ul className="nodes">
              {block.nodes.map((n, i) => {
                const isCond = block.succs.length > 1 && i === block.nodes.length - 1;
                return (
                  <li key={i}>
                    {isCond && <span className="badge cond">cond</span>}
                    <pre className="code">{n.text}</pre>
                    <span className="pos">
                      {n.range.startLine}:{n.range.startCol}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="label">{label}:</span>
      <span className="value">{children}</span>
    </div>
  );
}
