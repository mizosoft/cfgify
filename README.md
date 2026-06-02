# go-cfg

> *shamelessly written by Claude with "guidance" from me* - @mizosoft

A command-line tool that pretty-prints the control-flow graph (CFG) of every function in a Go source file. Built on top of [`golang.org/x/tools/go/cfg`](https://pkg.go.dev/golang.org/x/tools/go/cfg) as a learning aid for understanding how Go's CFG package structures programs.

## Example output

```
╔══════════════════════════════════════════╗
  Function: EarlyReturn
╚══════════════════════════════════════════╝

  4 blocks

  Block 0   Body  [ENTRY]
  ┌──────────────────────────────────────────
  │ gov: {
  │ cond:
  │   x < 0
  │
  └─ true  → Block 1
     false → Block 2

  Block 1   IfThen
  ┌──────────────────────────────────────────
  │ gov: if x < 0 {
  │ ← pred: Block 0
  │  return -1
  │
  └─ (terminal)
  ...
```

## Installation

Requires Go 1.23+.

```bash
git clone <repo>
cd go-cfg
go build -o go-cfg .
```

## Usage

```
go-cfg [-pos] <file.go>
```

| Flag | Description |
|------|-------------|
| `-pos` | Annotate each node and governing statement with its source position (`file:line:col`) |

### Examples

```bash
# Print CFGs for all functions in a file
./go-cfg sample/sample.go

# Include source positions
./go-cfg -pos sample/sample.go
```
