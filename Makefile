.PHONY: web build test clean

# Build the frontend into web/dist/. dist/ is gitignored; it is a build-time
# input embedded only by release builds (the embed_assets tag), never committed.
web:
	cd web && npm ci && npm run build

# Release build: build the frontend, then compile with it embedded.
# Plain `go build .` (no tag) skips the embed and serves a dev stub instead.
build: web
	go build -tags embed_assets -o cfgify .

test:
	go test ./...

clean:
	rm -f cfgify
	rm -rf web/dist