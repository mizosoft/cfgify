// Package web embeds the built frontend assets so the cfgify binary can
// serve them without any external files at runtime.
//
// The contents of dist/ are produced by `npm run build` in this directory.
// A placeholder index.html lives there until the real frontend lands.
package web

import "embed"

//go:embed dist
var Dist embed.FS
