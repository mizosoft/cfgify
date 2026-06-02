package sample

import (
  "fmt"
  "os"
)

func Simple() {
  var t = true
  if t {
    return
  }
  fmt.Println("Simple Test")
}

// SimpleSeq — straight-line code, no branches.
func SimpleSeq() {
  x := 1
  y := x + 2
  fmt.Println(y)
}

// IfElse — basic two-way branch.
func IfElse(n int) string {
  if n > 0 {
    return "positive"
  } else {
    return "non-positive"
  }
}

// EarlyReturn — multiple return paths.
func EarlyReturn(x int) int {
  if x < 0 {
    return -1
  }
  if x == 0 {
    return 0
  }
  return 1
}

// ForLoop — counted loop produces back-edge in CFG.
func ForLoop(n int) int {
  sum := 0
  for i := 0; i < n; i++ {
    sum += i
  }
  return sum
}

// ForBreak — loop with break shows conditional exit from loop body.
func ForBreak(items []int) int {
  for _, v := range items {
    if v < 0 {
      break
    }
    fmt.Println(v)
  }
  return len(items)
}

// SwitchStmt — switch produces multiple successors from the tag block.
func SwitchStmt(op string) int {
  switch op {
  case "add":
    return 1
  case "sub":
    return 2
  default:
    return -1
  }
}

// PanicPath — a call known never to return ends its block with no successor.
func PanicPath(ok bool) {
  if !ok {
    panic("not ok")
  }
  fmt.Println("all good")
}

// OsExit — os.Exit is also treated as non-returning.
func OsExit(code int) {
  if code != 0 {
    fmt.Fprintln(os.Stderr, "error")
    os.Exit(code)
  }
  fmt.Println("success")
}
