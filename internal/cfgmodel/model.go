// Package cfgmodel defines the language-agnostic representation of a
// control-flow graph that both the CLI printer and the HTTP server consume.
package cfgmodel

// Range is a source span carrying both byte offsets (for editor-friendly
// selection math) and 1-based line:col (for human display).
type Range struct {
  StartOffset int `json:"startOffset"`
  EndOffset   int `json:"endOffset"`
  StartLine   int `json:"startLine"`
  StartCol    int `json:"startCol"`
  EndLine     int `json:"endLine"`
  EndCol      int `json:"endCol"`
}

// Node is a statement or expression that appears inside a block.
type Node struct {
  Text  string `json:"text"`
  Range Range  `json:"range"`
}

// Edge is an outgoing transition from a block.
// Label is "" for an unconditional edge, "true"/"false" for two-way branches,
// or "case[N]" for multi-way branches (switch/select).
type Edge struct {
  To    int    `json:"to"`
  Label string `json:"label,omitempty"`
}

// Block is a basic block in a function's CFG.
type Block struct {
  Index     int    `json:"index"`
  Kind      string `json:"kind"`
  Live      bool   `json:"live"`
  Governing *Node  `json:"governing,omitempty"`
  Nodes     []Node `json:"nodes"`
  Succs     []Edge `json:"succs"`
}

// Function is a named function with its CFG.
type Function struct {
  Name   string  `json:"name"`
  Range  Range   `json:"range"`
  Blocks []Block `json:"blocks"`
}

// Result is the full analysis output for a single source unit.
type Result struct {
  Language  string     `json:"language"`
  Filename  string     `json:"filename,omitempty"`
  Functions []Function `json:"functions"`
}