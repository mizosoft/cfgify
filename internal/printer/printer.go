// Package printer renders a cfgmodel.Result as colored ANSI text.
package printer

import (
  "fmt"
  "io"
  "strings"

  "cfgify/internal/cfgmodel"
)

// ANSI terminal colors.
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

// Options controls optional printer features.
type Options struct {
  // ShowPos annotates each node and governing statement with its source
  // position (file:line:col).
  ShowPos bool
}

// Print writes the result to w.
func Print(w io.Writer, result *cfgmodel.Result, opts Options) {
  for _, fn := range result.Functions {
    printFunction(w, result.Filename, fn, opts)
  }
}

func printFunction(w io.Writer, filename string, fn cfgmodel.Function, opts Options) {
  preds := buildPreds(fn.Blocks)

  fmt.Fprintf(w, "%s%s╔══════════════════════════════════════════╗%s\n", bold, cyan, reset)
  fmt.Fprintf(w, "%s%s  Function: %-31s  %s\n", bold, cyan, fn.Name, reset)
  fmt.Fprintf(w, "%s%s╚══════════════════════════════════════════╝%s\n\n", bold, cyan, reset)
  fmt.Fprintf(w, "  %s%d blocks%s\n\n", gray, len(fn.Blocks), reset)

  for i, b := range fn.Blocks {
    isEntry := i == 0
    isExit := i == len(fn.Blocks)-1
    kc := kindColor(b.Kind)

    // ── block header ──────────────────────────────────────────
    var tags []string
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

    fmt.Fprintf(w, "  %s%sBlock %-2d%s  %s%s%s%s%s\n",
      bold, yellow, b.Index, reset,
      kc, bold, b.Kind, reset,
      tagStr,
    )
    fmt.Fprintf(w, "  %s┌──────────────────────────────────────────%s\n", gray, reset)

    // ── governing statement (the control stmt this block belongs to) ──
    if b.Governing != nil {
      firstLine := strings.SplitN(b.Governing.Text, "\n", 2)[0]
      posStr := ""
      if opts.ShowPos {
        posStr = fmt.Sprintf("  %s@ %s%s", gray, formatPos(filename, b.Governing.Range), reset)
      }
      fmt.Fprintf(w, "  %s│%s %sgov:%s %s%s\n", gray, reset, gray, reset, firstLine, posStr)
    }

    // ── predecessors ──────────────────────────────────────────
    if ps := preds[b.Index]; len(ps) > 0 {
      parts := make([]string, len(ps))
      for j, p := range ps {
        parts[j] = fmt.Sprintf("Block %d", p)
      }
      fmt.Fprintf(w, "  %s│%s %s← pred:%s %s\n", gray, reset, gray, reset, strings.Join(parts, ", "))
    }

    // ── nodes ─────────────────────────────────────────────────
    if len(b.Nodes) == 0 {
      fmt.Fprintf(w, "  %s│  (empty)%s\n", gray, reset)
    }
    for j, node := range b.Nodes {
      // The last node of a multi-successor block is the branch condition.
      isCond := len(b.Succs) > 1 && j == len(b.Nodes)-1

      lines := strings.Split(node.Text, "\n")

      posStr := ""
      if opts.ShowPos {
        posStr = fmt.Sprintf("  %s@ %s%s", gray, formatPos(filename, node.Range), reset)
      }

      if isCond {
        fmt.Fprintf(w, "  %s│%s %scond:%s%s\n", gray, reset, gray, reset, posStr)
        for _, line := range lines {
          fmt.Fprintf(w, "  %s│%s   %s%s%s%s\n", gray, reset, bold, white, line, reset)
        }
      } else {
        for k, line := range lines {
          if k == 0 {
            fmt.Fprintf(w, "  %s│%s  %s%s\n", gray, reset, line, posStr)
          } else {
            fmt.Fprintf(w, "  %s│%s  %s\n", gray, reset, line)
          }
        }
      }
    }

    // ── successors ────────────────────────────────────────────
    fmt.Fprintf(w, "  %s│%s\n", gray, reset)
    switch len(b.Succs) {
    case 0:
      fmt.Fprintf(w, "  %s└─ (terminal)%s\n", gray, reset)
    case 1:
      fmt.Fprintf(w, "  %s└─%s %s↓%s Block %d\n", gray, reset, green, reset, b.Succs[0].To)
    case 2:
      fmt.Fprintf(w, "  %s└─%s %strue%s  → Block %d\n", gray, reset, green, reset, b.Succs[0].To)
      fmt.Fprintf(w, "     %sfalse%s → Block %d\n", red, reset, b.Succs[1].To)
    default:
      for j, s := range b.Succs {
        fmt.Fprintf(w, "  %s└─%s case[%d] → Block %d\n", gray, reset, j, s.To)
      }
    }

    fmt.Fprintln(w)
  }

  // ── edge list summary ──────────────────────────────────────────
  fmt.Fprintf(w, "  %s%sEdge list:%s\n", bold, gray, reset)
  for _, b := range fn.Blocks {
    for j, s := range b.Succs {
      label := ""
      if len(b.Succs) == 2 {
        if j == 0 {
          label = green + " [true] " + reset
        } else {
          label = red + " [false]" + reset
        }
      }
      fmt.Fprintf(w, "  %s  Block %-2d  →%s  Block %d\n", gray, b.Index, label, s.To)
    }
  }
  fmt.Fprintln(w)
}

func buildPreds(blocks []cfgmodel.Block) map[int][]int {
  preds := make(map[int][]int, len(blocks))
  for _, b := range blocks {
    for _, s := range b.Succs {
      preds[s.To] = append(preds[s.To], b.Index)
    }
  }
  return preds
}

func kindColor(kind string) string {
  switch kind {
  case "IfThen", "IfElse", "IfDone":
    return cyan
  case "ForBody", "ForLoop", "ForPost", "ForDone",
    "RangeBody", "RangeLoop", "RangeDone":
    return blue
  case "SwitchCaseBody", "SwitchDone", "SwitchNextCase",
    "SelectCaseBody", "SelectDone", "SelectAfterCase":
    return yellow
  case "Unreachable":
    return red
  default:
    return white
  }
}

func formatPos(filename string, r cfgmodel.Range) string {
  return fmt.Sprintf("%s:%d:%d", filename, r.StartLine, r.StartCol)
}