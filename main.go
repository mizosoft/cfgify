package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"

	"github.com/mizosoft/cfgify/internal/analyzer"
	_ "github.com/mizosoft/cfgify/internal/analyzer/golang"
	"github.com/mizosoft/cfgify/internal/printer"
	"github.com/mizosoft/cfgify/internal/server"
)

// Build metadata, overridden at release time via -ldflags (see .goreleaser.yaml
// and the Makefile). The defaults apply to plain `go build` / `go install`.
var (
	version = "dev"
	commit  = "none"
	date    = "unknown"
)

func main() {
	if len(os.Args) >= 2 {
		switch os.Args[1] {
		case "serve":
			runServe(os.Args[2:])
			return
		case "version", "-v", "--version":
			fmt.Printf("cfgify %s (commit %s, built %s)\n", version, commit, date)
			return
		}
	}
	runAnalyze(os.Args[1:])
}

func runAnalyze(args []string) {
	fs := flag.NewFlagSet("cfgify", flag.ExitOnError)
	showPos := fs.Bool("pos", false, "print source position of each node")
	fs.Usage = func() {
		fmt.Fprintln(os.Stderr, "Usage: cfgify [-pos] <file.go>")
		fmt.Fprintln(os.Stderr, "       cfgify serve [--port 8080]")
		fmt.Fprintln(os.Stderr, "       cfgify version")
		fs.PrintDefaults()
	}
	_ = fs.Parse(args)

	if fs.NArg() < 1 {
		fs.Usage()
		os.Exit(1)
	}

	filename := fs.Arg(0)
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

func runServe(args []string) {
	fs := flag.NewFlagSet("cfgify serve", flag.ExitOnError)
	port := fs.Int("port", 8080, "port to listen on")
	addr := fs.String("addr", "127.0.0.1", "address to bind to")
	_ = fs.Parse(args)

	srv, err := server.New()
	if err != nil {
		fmt.Fprintf(os.Stderr, "server init: %v\n", err)
		os.Exit(1)
	}

	listen := fmt.Sprintf("%s:%d", *addr, *port)
	fmt.Fprintf(os.Stderr, "cfgify serve listening on http://%s\n", listen)
	if err := http.ListenAndServe(listen, srv.Handler()); err != nil {
		fmt.Fprintf(os.Stderr, "server: %v\n", err)
		os.Exit(1)
	}
}
