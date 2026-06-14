// Package golang implements a Go-language analyzer that builds a cfgmodel
// from a Go source file using golang.org/x/tools/go/cfg.
package golang

import (
  "bytes"
  "fmt"
  "go/ast"
  "go/format"
  "go/parser"
  "go/token"
  "strings"

  "golang.org/x/tools/go/cfg"

  "cfgify/internal/analyzer"
  "cfgify/internal/cfgmodel"
)

const languageID = "go"

func init() {
  analyzer.Register(languageID, &Analyzer{})
}

type Analyzer struct{}

func (a *Analyzer) Analyze(filename string, source []byte) (*cfgmodel.Result, error) {
  fset := token.NewFileSet()
  f, err := parser.ParseFile(fset, filename, source, 0)
  if err != nil {
    return nil, err
  }

  result := &cfgmodel.Result{
    Language: languageID,
    Filename: filename,
  }
  for _, decl := range f.Decls {
    fn, ok := decl.(*ast.FuncDecl)
    if !ok || fn.Body == nil {
      continue
    }
    result.Functions = append(result.Functions, buildFunction(fset, fn))
  }
  return result, nil
}

func buildFunction(fset *token.FileSet, fn *ast.FuncDecl) cfgmodel.Function {
  g := cfg.New(fn.Body, mayReturn)

  blocks := make([]cfgmodel.Block, len(g.Blocks))
  for i, b := range g.Blocks {
    blk := cfgmodel.Block{
      Index: int(b.Index),
      Kind:  b.Kind.String(),
      Live:  b.Live,
      Nodes: make([]cfgmodel.Node, 0, len(b.Nodes)),
      Succs: make([]cfgmodel.Edge, 0, len(b.Succs)),
    }
    if b.Stmt != nil {
      n := makeNode(fset, b.Stmt)
      blk.Governing = &n
    }
    for _, node := range b.Nodes {
      blk.Nodes = append(blk.Nodes, makeNode(fset, node))
    }
    for j, s := range b.Succs {
      blk.Succs = append(blk.Succs, cfgmodel.Edge{
        To:    int(s.Index),
        Label: edgeLabel(len(b.Succs), j),
      })
    }
    blocks[i] = blk
  }

  return cfgmodel.Function{
    Name:   fn.Name.Name,
    Range:  makeRange(fset, fn.Pos(), fn.End()),
    Blocks: blocks,
  }
}

// edgeLabel mirrors the CLI's convention:
//   - single successor: ""
//   - two successors:   index 0 → "true", index 1 → "false"
//   - 3+ successors:    "case[j]"
func edgeLabel(succCount, j int) string {
  switch {
  case succCount == 2 && j == 0:
    return "true"
  case succCount == 2 && j == 1:
    return "false"
  case succCount > 2:
    return fmt.Sprintf("case[%d]", j)
  }
  return ""
}

func makeNode(fset *token.FileSet, node ast.Node) cfgmodel.Node {
  return cfgmodel.Node{
    Text:  nodeText(fset, node),
    Range: makeRange(fset, node.Pos(), node.End()),
  }
}

func makeRange(fset *token.FileSet, start, end token.Pos) cfgmodel.Range {
  s := fset.Position(start)
  e := fset.Position(end)
  return cfgmodel.Range{
    StartOffset: s.Offset,
    EndOffset:   e.Offset,
    StartLine:   s.Line,
    StartCol:    s.Column,
    EndLine:     e.Line,
    EndCol:      e.Column,
  }
}

func nodeText(fset *token.FileSet, node ast.Node) string {
  var buf bytes.Buffer
  if err := format.Node(&buf, fset, node); err != nil {
    return fmt.Sprintf("<%T>", node)
  }
  return strings.TrimRight(buf.String(), "\n")
}

// mayReturn reports whether a call may return normally.
// cfg.New uses this to detect unconditional exits like panic / os.Exit.
func mayReturn(call *ast.CallExpr) bool {
  switch fn := call.Fun.(type) {
  case *ast.Ident:
    return fn.Name != "panic"
  case *ast.SelectorExpr:
    if pkg, ok := fn.X.(*ast.Ident); ok {
      switch {
      case pkg.Name == "os" && fn.Sel.Name == "Exit":
        return false
      case pkg.Name == "log" && (fn.Sel.Name == "Fatal" ||
        fn.Sel.Name == "Fatalf" || fn.Sel.Name == "Fatalln"):
        return false
      }
    }
  }
  return true
}