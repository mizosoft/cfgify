package main

import (
  "bytes"
  "flag"
  "fmt"
  "go/ast"
  "go/format"
  "go/parser"
  "go/token"
  "os"
  "strings"

  "golang.org/x/tools/go/cfg"
)

// ANSI terminal colors
const (
  bold   = "\033[1m"
  reset  = "\033[0m"
  cyan   = "\033[36m"
  yellow = "\033[33m"
  green  = "\033[32m"
  red    = "\033[31m"
  gray   = "\033[90m"
  white  = "\033[97m"
  blue   = "\033[34m"
)

func main() {
  showPos := flag.Bool("pos", false, "print source position of each node")
  flag.Usage = func() {
    fmt.Fprintln(os.Stderr, "Usage: cfgify [-pos] <file.go>")
    flag.PrintDefaults()
  }
  flag.Parse()

  if flag.NArg() < 1 {
    flag.Usage()
    os.Exit(1)
  }

  fset := token.NewFileSet()
  f, err := parser.ParseFile(fset, flag.Arg(0), nil, 0)
  if err != nil {
    fmt.Fprintf(os.Stderr, "parse error: %v\n", err)
    os.Exit(1)
  }

  found := false
  for _, decl := range f.Decls {
    fn, ok := decl.(*ast.FuncDecl)
    if !ok || fn.Body == nil {
      continue
    }
    found = true
    printFuncCFG(fset, fn, *showPos)
  }

  if !found {
    fmt.Fprintln(os.Stderr, "no function declarations found")
    os.Exit(1)
  }
}

// mayReturn reports whether the call may return normally.
// cfg.New uses this to detect unconditional exits.
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

// buildPreds returns a map from block index to its predecessor blocks.
// cfg.Block.Preds is unexported, so we derive it from Succs.
func buildPreds(g *cfg.CFG) map[int32][]*cfg.Block {
  preds := make(map[int32][]*cfg.Block, len(g.Blocks))
  for _, b := range g.Blocks {
    for _, s := range b.Succs {
      preds[s.Index] = append(preds[s.Index], b)
    }
  }
  return preds
}

// kindColor returns an ANSI color for a block kind to aid visual scanning.
func kindColor(k cfg.BlockKind) string {
  switch k {
  case cfg.KindIfThen, cfg.KindIfElse, cfg.KindIfDone:
    return cyan
  case cfg.KindForBody, cfg.KindForLoop, cfg.KindForPost, cfg.KindForDone:
    return blue
  case cfg.KindRangeBody, cfg.KindRangeLoop, cfg.KindRangeDone:
    return blue
  case cfg.KindSwitchCaseBody, cfg.KindSwitchDone, cfg.KindSwitchNextCase:
    return yellow
  case cfg.KindSelectCaseBody, cfg.KindSelectDone, cfg.KindSelectAfterCase:
    return yellow
  case cfg.KindUnreachable:
    return red
  default:
    return white
  }
}

// nodeText renders an AST node as formatted Go source text.
func nodeText(fset *token.FileSet, node ast.Node) string {
  var buf bytes.Buffer
  if err := format.Node(&buf, fset, node); err != nil {
    return fmt.Sprintf("<%T>", node)
  }
  return strings.TrimRight(buf.String(), "\n")
}

func printFuncCFG(fset *token.FileSet, fn *ast.FuncDecl, showPos bool) {
  g := cfg.New(fn.Body, mayReturn)
  preds := buildPreds(g)

  fmt.Printf("%s%s╔══════════════════════════════════════════╗%s\n", bold, cyan, reset)
  fmt.Printf("%s%s  Function: %-31s  %s\n", bold, cyan, fn.Name.Name, reset)
  fmt.Printf("%s%s╚══════════════════════════════════════════╝%s\n\n", bold, cyan, reset)
  fmt.Printf("  %s%d blocks%s\n\n", gray, len(g.Blocks), reset)

  for i, b := range g.Blocks {
    isEntry := i == 0
    isExit := i == len(g.Blocks)-1
    kc := kindColor(b.Kind)

    // ── block header ──────────────────────────────────────────
    tags := []string{}
    if isEntry {
      tags = append(tags, green+"ENTRY"+reset)
    }
    if isExit {
      tags = append(tags, red+"EXIT"+reset)
    }
    if !b.Live {
      tags = append(tags, red+"DEAD"+reset)
    }

    tagStr := ""
    if len(tags) > 0 {
      tagStr = "  [" + strings.Join(tags, " ") + "]"
    }

    fmt.Printf("  %s%sBlock %-2d%s  %s%s%s%s%s\n",
      bold, yellow, b.Index, reset,
      kc, bold, b.Kind.String(), reset,
      tagStr,
    )
    fmt.Printf("  %s┌──────────────────────────────────────────%s\n", gray, reset)

    // ── governing statement (the control stmt this block belongs to) ──
    if b.Stmt != nil {
      stmtText := nodeText(fset, b.Stmt)
      // Clamp long control statements to first line for readability
      firstLine := strings.SplitN(stmtText, "\n", 2)[0]
      posStr := ""
      if showPos {
        posStr = fmt.Sprintf("  %s@ %s%s", gray, fset.Position(b.Stmt.Pos()), reset)
      }
      fmt.Printf("  %s│%s %sgov:%s %s%s\n", gray, reset, gray, reset, firstLine, posStr)
    }

    // ── predecessors ──────────────────────────────────────────
    if ps := preds[b.Index]; len(ps) > 0 {
      parts := make([]string, len(ps))
      for j, p := range ps {
        parts[j] = fmt.Sprintf("Block %d", p.Index)
      }
      fmt.Printf("  %s│%s %s← pred:%s %s\n", gray, reset, gray, reset, strings.Join(parts, ", "))
    }

    // ── nodes ─────────────────────────────────────────────────
    if len(b.Nodes) == 0 {
      fmt.Printf("  %s│  (empty)%s\n", gray, reset)
    }
    for j, node := range b.Nodes {
      // The last node of a multi-successor block is the branch condition.
      isCond := len(b.Succs) > 1 && j == len(b.Nodes)-1

      text := nodeText(fset, node)
      lines := strings.Split(text, "\n")

      posStr := ""
      if showPos {
        posStr = fmt.Sprintf("  %s@ %s%s", gray, fset.Position(node.Pos()), reset)
      }

      if isCond {
        fmt.Printf("  %s│%s %scond:%s%s\n", gray, reset, gray, reset, posStr)
        for _, line := range lines {
          fmt.Printf("  %s│%s   %s%s%s%s\n", gray, reset, bold, white, line, reset)
        }
      } else {
        for i, line := range lines {
          if i == 0 {
            fmt.Printf("  %s│%s  %s%s\n", gray, reset, line, posStr)
          } else {
            fmt.Printf("  %s│%s  %s\n", gray, reset, line)
          }
        }
      }
    }

    // ── successors ────────────────────────────────────────────
    fmt.Printf("  %s│%s\n", gray, reset)
    switch len(b.Succs) {
    case 0:
      fmt.Printf("  %s└─ (terminal)%s\n", gray, reset)
    case 1:
      fmt.Printf("  %s└─%s %s↓%s Block %d\n", gray, reset, green, reset, b.Succs[0].Index)
    case 2:
      // By convention: index 0 = true/then branch, index 1 = false/else branch
      fmt.Printf("  %s└─%s %strue%s  → Block %d\n", gray, reset, green, reset, b.Succs[0].Index)
      fmt.Printf("     %sfalse%s → Block %d\n", red, reset, b.Succs[1].Index)
    default:
      for j, s := range b.Succs {
        fmt.Printf("  %s└─%s case[%d] → Block %d\n", gray, reset, j, s.Index)
      }
    }

    fmt.Println()
  }

  // ── edge list summary ──────────────────────────────────────────
  fmt.Printf("  %s%sEdge list:%s\n", bold, gray, reset)
  for _, b := range g.Blocks {
    for j, s := range b.Succs {
      label := ""
      if len(b.Succs) == 2 {
        if j == 0 {
          label = green + " [true] " + reset
        } else {
          label = red + " [false]" + reset
        }
      }
      fmt.Printf("  %s  Block %-2d  →%s  Block %d\n", gray, b.Index, label, s.Index)
    }
  }
  fmt.Println()
}
