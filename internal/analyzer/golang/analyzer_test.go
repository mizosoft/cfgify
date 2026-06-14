package golang

import (
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/tools/go/cfg"
)

// TestModelMatchesCFG asserts that, for every function declaration in the
// sample, the cfgmodel we build is a faithful 1:1 mapping of the underlying
// cfg.CFG: same block count and same per-block index, kind, liveness, node
// count, governing presence, successor count, and successor targets/order.
func TestModelMatchesCFG(t *testing.T) {
	path, err := filepath.Abs(filepath.Join("..", "..", "..", "sample", "sample.go"))
	if err != nil {
		t.Fatal(err)
	}
	src, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	a := &Analyzer{}
	res, err := a.Analyze(path, src)
	if err != nil {
		t.Fatal(err)
	}

	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, path, src, 0)
	if err != nil {
		t.Fatal(err)
	}

	var fnIdx int
	for _, decl := range f.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok || fn.Body == nil {
			continue
		}
		g := cfg.New(fn.Body, mayReturn)
		if fnIdx >= len(res.Functions) {
			t.Fatalf("%s: model is missing function", fn.Name.Name)
		}
		m := res.Functions[fnIdx]
		fnIdx++

		t.Run(fn.Name.Name, func(t *testing.T) {
			if m.Name != fn.Name.Name {
				t.Errorf("name mismatch: model=%q cfg=%q", m.Name, fn.Name.Name)
			}
			if len(m.Blocks) != len(g.Blocks) {
				t.Fatalf("block count mismatch: model=%d cfg=%d", len(m.Blocks), len(g.Blocks))
			}
			for i, b := range g.Blocks {
				mb := m.Blocks[i]
				if mb.Index != int(b.Index) {
					t.Errorf("Block[%d]: index mismatch: model=%d cfg=%d", i, mb.Index, b.Index)
				}
				if mb.Kind != b.Kind.String() {
					t.Errorf("Block[%d]: kind mismatch: model=%q cfg=%q", i, mb.Kind, b.Kind.String())
				}
				if mb.Live != b.Live {
					t.Errorf("Block[%d]: live mismatch: model=%v cfg=%v", i, mb.Live, b.Live)
				}
				if len(mb.Nodes) != len(b.Nodes) {
					t.Errorf("Block[%d]: node count mismatch: model=%d cfg=%d", i, len(mb.Nodes), len(b.Nodes))
				}
				if (mb.Governing != nil) != (b.Stmt != nil) {
					t.Errorf("Block[%d]: governing presence mismatch: model=%v cfg=%v",
						i, mb.Governing != nil, b.Stmt != nil)
				}
				if len(mb.Succs) != len(b.Succs) {
					t.Fatalf("Block[%d]: succ count mismatch: model=%d cfg=%d",
						i, len(mb.Succs), len(b.Succs))
				}
				for j, e := range mb.Succs {
					if e.To != int(b.Succs[j].Index) {
						t.Errorf("Block[%d].Succs[%d]: target mismatch: model=%d cfg=%d",
							i, j, e.To, b.Succs[j].Index)
					}
				}
			}
		})
	}
}
