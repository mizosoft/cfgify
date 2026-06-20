//go:build !embed_assets

package web

import "io/fs"

// Assets is nil in tag-less builds: the frontend is not embedded. The server
// serves a small stub at / explaining how to get the UI (run `npm run dev`
// against the API, or rebuild with `-tags embed_assets`). Release builds set
// the tag and embed the real assets via embed.go.
var Assets fs.FS = nil