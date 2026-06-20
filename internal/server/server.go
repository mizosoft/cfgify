// Package server exposes cfgify's analyzer over HTTP and serves the embedded
// frontend assets.
package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/mizosoft/cfgify/internal/analyzer"
	"github.com/mizosoft/cfgify/web"
)

// maxRequestBytes caps the size of an /api/analyze request body.
const maxRequestBytes = 1 << 20 // 1 MiB

// Server wires the HTTP routes for the analyze API and the embedded UI.
type Server struct {
	mux *http.ServeMux
}

// New builds a Server with /api/* routes. The frontend is mounted at / when it
// was embedded (release builds, -tags embed_assets); otherwise / serves a stub
// explaining how to get the UI.
func New() (*Server, error) {
	s := &Server{mux: http.NewServeMux()}
	s.mux.HandleFunc("POST /api/analyze", s.handleAnalyze)
	s.mux.HandleFunc("GET /api/languages", s.handleLanguages)
	if web.Assets != nil {
		s.mux.Handle("/", http.FileServerFS(web.Assets))
	} else {
		s.mux.HandleFunc("/", handleDevStub)
	}
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

// handleDevStub responds at / for tag-less builds where the frontend is not
// embedded. In development the UI is served by Vite (`npm run dev`), which
// proxies /api here; this page is what you see if you hit the API port directly.
func handleDevStub(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.WriteString(w, devStubHTML)
}

const devStubHTML = `<!doctype html>
<meta charset="utf-8">
<title>cfgify — UI not embedded</title>
<body style="font-family:system-ui;max-width:42rem;margin:4rem auto;padding:0 1rem;line-height:1.6">
<h1>cfgify</h1>
<p>This binary was built without the frontend embedded, so there is no UI here.
The API is live at <code>POST /api/analyze</code>.</p>
<p>To get the UI:</p>
<ul>
<li><b>Develop:</b> run <code>npm run dev</code> in <code>web/</code> and open the Vite dev server (it proxies <code>/api</code> here).</li>
<li><b>Embed it:</b> build with <code>make build</code> or <code>go build -tags embed_assets</code> (builds the frontend first).</li>
</ul>
</body>
`

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, errorResponse{Error: msg})
}
