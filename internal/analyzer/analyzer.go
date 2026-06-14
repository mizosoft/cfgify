// Package analyzer defines the language-pluggable interface for producing a
// CFG model from source code.
package analyzer

import (
  "fmt"
  "sort"

  "cfgify/internal/cfgmodel"
)

// Analyzer converts source bytes into a language-specific CFG model.
// Implementations live under internal/analyzer/<lang> and register themselves
// in init().
type Analyzer interface {
  Analyze(filename string, source []byte) (*cfgmodel.Result, error)
}

var registry = map[string]Analyzer{}

// Register attaches an analyzer to a language identifier (e.g. "go").
// Called by language packages from init().
func Register(language string, a Analyzer) {
  if _, exists := registry[language]; exists {
    panic(fmt.Sprintf("analyzer already registered for language %q", language))
  }
  registry[language] = a
}

// Get returns the analyzer registered for a language identifier.
func Get(language string) (Analyzer, bool) {
  a, ok := registry[language]
  return a, ok
}

// Languages returns the sorted list of registered language identifiers.
func Languages() []string {
  out := make([]string, 0, len(registry))
  for k := range registry {
    out = append(out, k)
  }
  sort.Strings(out)
  return out
}