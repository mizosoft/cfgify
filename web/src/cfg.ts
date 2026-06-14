// Selection math against a cfgmodel result. Used to map a cursor offset in
// the source editor to a (function, block) pair, and the reverse.

import type { Block, Func } from './types';

export type Selection = {
  functionIndex: number;
  blockIndex: number;
};

// Returns the byte range that best represents the block for selection
// purposes. Prefers the governing statement (covers the whole control
// construct) and falls back to the span across the block's nodes.
export function blockRange(b: Block): { startOffset: number; endOffset: number } | null {
  if (b.governing) {
    return {
      startOffset: b.governing.range.startOffset,
      endOffset: b.governing.range.endOffset,
    };
  }
  if (b.nodes.length === 0) return null;
  const first = b.nodes[0].range;
  const last = b.nodes[b.nodes.length - 1].range;
  return { startOffset: first.startOffset, endOffset: last.endOffset };
}

// Returns the index of the function in `functions` whose range contains
// `offset`, preferring the smallest enclosing function when nested.
export function findFunctionAt(functions: Func[], offset: number): number | null {
  let best: number | null = null;
  let bestSize = Infinity;
  for (let i = 0; i < functions.length; i++) {
    const r = functions[i].range;
    if (offset < r.startOffset || offset > r.endOffset) continue;
    const size = r.endOffset - r.startOffset;
    if (size < bestSize) {
      bestSize = size;
      best = i;
    }
  }
  return best;
}

// Returns the block index whose range most tightly contains `offset`.
// The deepest containing block wins so cursor inside an if-then arm picks
// the IfThen block, not the surrounding Body.
export function findBlockAt(fn: Func, offset: number): number | null {
  let best: number | null = null;
  let bestSize = Infinity;
  for (const b of fn.blocks) {
    const r = blockRange(b);
    if (!r) continue;
    if (offset < r.startOffset || offset > r.endOffset) continue;
    const size = r.endOffset - r.startOffset;
    if (size < bestSize) {
      bestSize = size;
      best = b.index;
    }
  }
  return best;
}

export function findBlock(fn: Func, blockIndex: number): Block | undefined {
  return fn.blocks.find((b) => b.index === blockIndex);
}

// Returns the block indices that target `blockIndex` via a successor edge.
export function predsOf(fn: Func, blockIndex: number): number[] {
  const out: number[] = [];
  for (const b of fn.blocks) {
    if (b.succs.some((s) => s.to === blockIndex)) out.push(b.index);
  }
  return out;
}