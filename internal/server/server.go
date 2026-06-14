// Package server exposes cfgify's analyzer over HTTP and serves the embedded
// frontend assets.
package server

import (
  "encoding/json"
  "fmt"
  "io/fs"
  "net/http"

  "cfgify/internal/analyzer"
  "cfgify/web"
)

// maxRequestBytes caps the size of an /api/analyze request body.
const maxRequestBytes = 1 << 20 // 1 MiB

// Server wires the HTTP routes for the analyze API and the embedded UI.
type Server struct {
  mux *http.ServeMux
}

// New builds a Server with /api/* routes and the embedded frontend mounted at /.
func New() (*Server, error) {
  dist, err := fs.Sub(web.Dist, "dist")
  if err != nil {
    return nil, fmt.Errorf("locate embedded frontend: %w", err)
  }

  s := &Server{mux: http.NewServeMux()}
  s.mux.HandleFunc("POST /api/analyze", s.handleAnalyze)
  s.mux.HandleFunc("GET /api/languages", s.handleLanguages)
  s.mux.Handle("/", http.FileServerFS(dist))
  return s, nil
}

// Handler returns the configured router.
func (s *Server) Handler() http.Handler {
  return s.mux
}

type analyzeRequest struct {
  Language string `json:"language"`
  Source   string `json:"source"`
  Filename string `json:"filename,omitempty"`
}

type errorResponse struct {
  Error string `json:"error"`
}

type languagesResponse struct {
  Languages []string `json:"languages"`
}

func (s *Server) handleAnalyze(w http.ResponseWriter, r *http.Request) {
  r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)

  var req analyzeRequest
  dec := json.NewDecoder(r.Body)
  dec.DisallowUnknownFields()
  if err := dec.Decode(&req); err != nil {
    writeError(w, http.StatusBadRequest, "invalid json: "+err.Error())
    return
  }
  if req.Language == "" {
    req.Language = "go"
  }
  if req.Filename == "" {
    req.Filename = "input." + req.Language
  }

  ana, ok := analyzer.Get(req.Language)
  if !ok {
    writeError(w, http.StatusBadRequest, fmt.Sprintf("unknown language %q", req.Language))
    return
  }

  result, err := ana.Analyze(req.Filename, []byte(req.Source))
  if err != nil {
    writeError(w, http.StatusBadRequest, err.Error())
    return
  }
  writeJSON(w, http.StatusOK, result)
}

func (s *Server) handleLanguages(w http.ResponseWriter, r *http.Request) {
  writeJSON(w, http.StatusOK, languagesResponse{Languages: analyzer.Languages()})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
  w.Header().Set("Content-Type", "application/json")
  w.WriteHeader(status)
  _ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
  writeJSON(w, status, errorResponse{Error: msg})
}