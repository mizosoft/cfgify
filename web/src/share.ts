// Source persistence and shareable links. The current source is mirrored to
// localStorage so a reload restores it, and can be encoded into the URL hash
// (godbolt-style) to share an exact snippet.

const STORAGE_KEY = 'cfgify.source';

// UTF-8 safe base64 (btoa only handles latin1).
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b: string): string {
  const bin = atob(b);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Resolve the source to load on startup: ?code in the URL hash wins (a shared
// link), then the last-edited source in localStorage, then the fallback.
export function loadInitialSource(fallback: string): string {
  const code = new URLSearchParams(location.hash.slice(1)).get('code');
  if (code) {
    try {
      return fromBase64(code);
    } catch {
      // malformed link — fall through
    }
  }
  try {
    return localStorage.getItem(STORAGE_KEY) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveSource(source: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, source);
  } catch {
    // ignore quota / private-mode errors
  }
}

// Encode the source into the URL hash and return the shareable absolute URL.
export function buildShareUrl(source: string): string {
  const url = new URL(location.href);
  url.hash = 'code=' + toBase64(source);
  return url.toString();
}