import type { AnalyzeError, AnalyzeResult } from './types';

export async function analyze(language: string, source: string): Promise<AnalyzeResult> {
  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, source }),
  });
  const data: AnalyzeResult | AnalyzeError = await r.json();
  if (!r.ok || 'error' in data) {
    throw new Error('error' in data ? data.error : `request failed with ${r.status}`);
  }
  return data;
}