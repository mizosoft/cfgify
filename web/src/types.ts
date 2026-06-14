// TypeScript mirror of internal/cfgmodel/model.go. Field names match the
// JSON tags emitted by the Go server.

export type Range = {
  startOffset: number;
  endOffset: number;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
};

export type Node = {
  text: string;
  range: Range;
};

export type Edge = {
  to: number;
  label?: string;
};

export type Block = {
  index: number;
  kind: string;
  live: boolean;
  governing?: Node;
  nodes: Node[];
  succs: Edge[];
};

export type Func = {
  name: string;
  range: Range;
  blocks: Block[];
};

export type AnalyzeResult = {
  language: string;
  filename?: string;
  functions: Func[];
};

export type AnalyzeError = {
  error: string;
};