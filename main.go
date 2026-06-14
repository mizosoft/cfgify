package main

import (
  "flag"
  "fmt"
  "os"

  "cfgify/internal/analyzer"
  _ "cfgify/internal/analyzer/golang"
  "cfgify/internal/printer"
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

  filename := flag.Arg(0)
  src, err := os.ReadFile(filename)
  if err != nil {
    fmt.Fprintf(os.Stderr, "read error: %v\n", err)
    os.Exit(1)
  }

  ana, ok := analyzer.Get("go")
  if !ok {
    fmt.Fprintln(os.Stderr, "no analyzer registered for go")
    os.Exit(1)
  }

  result, err := ana.Analyze(filename, src)
  if err != nil {
    fmt.Fprintf(os.Stderr, "parse error: %v\n", err)
    os.Exit(1)
  }

  if len(result.Functions) == 0 {
    fmt.Fprintln(os.Stderr, "no function declarations found")
    os.Exit(1)
  }

  printer.Print(os.Stdout, result, printer.Options{ShowPos: *showPos})
}