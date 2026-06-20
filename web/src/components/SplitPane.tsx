import { useCallback, useEffect, useRef, useState } from 'react';

type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
  // Percentage width of the left pane, persisted under this key.
  storageKey?: string;
  // Minimum width (percent) either pane is allowed to shrink to.
  minPct?: number;
  defaultPct?: number;
};

// A horizontal two-pane split with a draggable divider. The left pane's width
// is stored as a percentage so the layout survives reloads; double-clicking the
// divider resets it.
export default function SplitPane({
  left,
  right,
  storageKey,
  minPct = 22,
  defaultPct = 50,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const [pct, setPct] = useState(() => {
    if (!storageKey) return defaultPct;
    const saved = Number(localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved > 0 ? saved : defaultPct;
  });

  const clamp = useCallback(
    (v: number) => Math.min(100 - minPct, Math.max(minPct, v)),
    [minPct],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setPct(clamp(((e.clientX - rect.left) / rect.width) * 100));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [clamp]);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(Math.round(pct)));
  }, [pct, storageKey]);

  const startDrag = () => {
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="split" ref={containerRef}>
      <div className="split-pane" style={{ width: `${pct}%` }}>
        {left}
      </div>
      <div
        className="splitter"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startDrag}
        onDoubleClick={() => setPct(defaultPct)}
        title="Drag to resize · double-click to reset"
      >
        <span className="splitter-grip" />
      </div>
      <div className="split-pane" style={{ flex: 1 }}>
        {right}
      </div>
    </div>
  );
}