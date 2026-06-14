import { createContext } from 'react';

// HoverContext carries the currently hovered and pinned block indices so
// BlockNode can pick them up without us having to mutate the react-flow
// `nodes` array on every hover change (which causes ReactFlow to re-render
// every node and produces visible flicker as mouseenter/leave events fight).
export type HoverState = {
  hovered: number | null;
  pinned: number | null;
};

export const HoverContext = createContext<HoverState>({ hovered: null, pinned: null });
