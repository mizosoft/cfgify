// Selection math against a cfgmodel result. Used to map a cursor offset in
// the source editor to a (function, block) pair, and the reverse.

import type { Block, Func } from './types';

export type Selection = {
  functionIndex: number;
  blockIndex: number;
};

// Returns the byte range of the source code a block actually executes — the
// span from its first node to its last. Synthetic Unreachable blocks have
// no nodes (cfg's bookkeeping for code paths after a terminator) and return
// null: they don't own any source. Callers should treat null as "no
// highlightable location".
export function blockRange(b: Block): { startOffset: number; endOffset: number } | null {
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

// Returns the block whose code most tightly contains `offset`.
//
// Algorithm:
//   1. Prefer a block whose own *node* range contains the cursor — that is,
//      the cursor is sitting on a statement/expression the block actually
//      executes. Pick the tightest such node across all blocks.
//   2. Otherwise fall back to the smallest *governing* range among blocks
//      that have nodes. This handles cursor positions on syntax that isn't
//      represented as a node (the `if` keyword, braces, the function
//      signature) by picking the enclosing construct's block.
//
// Synthetic Unreachable blocks have no nodes, so they never win pass 1.
// They're also skipped in pass 2 (where the rule "have nodes" filters them
// out), which keeps highlights aligned with executable code only.
export function findBlockAt(fn: Func, offset: number): number | null {
  let best: number | null = null;
  let bestSize = Infinity;

  for (const b of fn.blocks) {
    for (const n of b.nodes) {
      if (offset < n.range.startOffset || offset > n.range.endOffset) continue;
      const size = n.range.endOffset - n.range.startOffset;
      if (size < bestSize) {
        bestSize = size;
        best = b.index;
      }
    }
  }
  if (best !== null) return best;

  bestSize = Infinity;
  for (const b of fn.blocks) {
    if (b.nodes.length === 0 || !b.governing) continue;
    const r = b.governing.range;
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
