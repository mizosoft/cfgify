//go:build embed_assets

// Package web embeds the built frontend assets so the cfgify binary can serve
// them without any external files at runtime.
//
// This file is compiled only under the `embed_assets` build tag (release
// builds). The dist/ directory it embeds is produced by `npm run build` in this
// directory (or `make web` from the repo root) and is NOT committed — CI and
// goreleaser build it before compiling with `-tags embed_assets`. Tag-less
// builds compile embed_dev.go instead, where Assets is nil.
package web

import (
	"embed"
	"io/fs"
)

//go:embed dist
var distFS embed.FS

// Assets is the built frontend rooted at the dist directory, ready to serve.
var Assets fs.FS = mustSub(distFS, "dist")

func mustSub(f fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(f, dir)
	if err != nil {
		panic(err)
	}
	return sub
}