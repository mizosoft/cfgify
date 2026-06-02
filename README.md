# go-cfg

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

## Output anatomy

Each block in the CFG is printed with:

| Field | Description |
|-------|-------------|
| **Block N** | Block index and kind (e.g. `IfThen`, `ForBody`, `Unreachable`) |
| `gov:` | The governing statement this block belongs to (first line only) |
| `← pred:` | Predecessor blocks |
| nodes | Statements/expressions in the block; the last node of a multi-successor block is labeled `cond:` |
| successors | `↓ Block N` (fall-through), `true/false → Block N` (branch), or `(terminal)` |

An **edge list** summary is printed after each function's blocks.

### Block kinds and colors

| Color | Kinds |
|-------|-------|
| Cyan | `IfThen`, `IfElse`, `IfDone` |
| Blue | `ForBody`, `ForLoop`, `ForPost`, `ForDone`, `RangeBody`, `RangeLoop`, `RangeDone` |
| Yellow | `SwitchCaseBody`, `SwitchDone`, `SwitchNextCase`, `SelectCaseBody`, `SelectDone`, `SelectAfterCase` |
| Red | `Unreachable` |
| White | `Body` (default) |

Blocks tagged `[ENTRY]`, `[EXIT]`, or `[DEAD]` are highlighted accordingly.

## Project structure

```
go-cfg/
├── main.go          # CFG printer
└── sample/
    └── sample.go    # Sample functions covering common control-flow patterns
```