// Ready-made snippets that exercise different control-flow shapes, so the CFG
// structure for each construct can be inspected quickly. Indented with tabs to
// match gofmt.

export type Sample = { name: string; code: string };

export const SAMPLES: Sample[] = [
  {
    name: 'Early return',
    code: `package sample

import "fmt"

func EarlyReturn(x int) int {
\tif x < 0 {
\t\treturn -1
\t}
\tif x == 0 {
\t\treturn 0
\t}
\tfmt.Println(x)
\treturn 1
}
`,
  },
  {
    name: 'For loop',
    code: `package sample

func Sum(ns []int) int {
\ttotal := 0
\tfor i := 0; i < len(ns); i++ {
\t\tif ns[i] < 0 {
\t\t\tcontinue
\t\t}
\t\tif ns[i] > 100 {
\t\t\tbreak
\t\t}
\t\ttotal += ns[i]
\t}
\treturn total
}
`,
  },
  {
    name: 'Range loop',
    code: `package sample

func Count(m map[string]int) int {
\tn := 0
\tfor k, v := range m {
\t\tif k == "" {
\t\t\tcontinue
\t\t}
\t\tn += v
\t}
\treturn n
}
`,
  },
  {
    name: 'Switch',
    code: `package sample

func Classify(n int) string {
\tswitch {
\tcase n < 0:
\t\treturn "negative"
\tcase n == 0:
\t\treturn "zero"
\tdefault:
\t\treturn "positive"
\t}
}
`,
  },
  {
    name: 'Type switch',
    code: `package sample

import "fmt"

func Describe(v any) string {
\tswitch x := v.(type) {
\tcase int:
\t\treturn fmt.Sprintf("int %d", x)
\tcase string:
\t\treturn "string " + x
\tdefault:
\t\treturn "unknown"
\t}
}
`,
  },
  {
    name: 'Defer & recover',
    code: `package sample

import "fmt"

func Safe() (err error) {
\tdefer func() {
\t\tif r := recover(); r != nil {
\t\t\terr = fmt.Errorf("recovered: %v", r)
\t\t}
\t}()
\tpanic("boom")
}
`,
  },
  {
    name: 'Select',
    code: `package sample

func Race(a, b <-chan int) int {
\tselect {
\tcase x := <-a:
\t\treturn x
\tcase y := <-b:
\t\treturn y
\t}
}
`,
  },
];

export const DEFAULT_SOURCE = SAMPLES[0].code;