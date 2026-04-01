/**
 * Returns the appropriate default backend host.
 * - Server-side (Node/Astro SSR): reads BACKEND_URL env var, falls back to 'http://localhost:8000'
 * - Browser: '' (empty string = relative URL, routes through nginx)
 */
export function getDefaultBackendHost(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.BACKEND_URL || 'http://localhost:8000';
}
