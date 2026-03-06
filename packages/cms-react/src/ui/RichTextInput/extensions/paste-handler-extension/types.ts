/**
 * Paste handler options interface
 */
export interface PasteHandlerOptions {
  enabled?: boolean;
  onPaste?: ((files: File[]) => void) | null;
  HTMLAttributes?: Record<string, unknown>;
  backendHost: string;
  token: string | undefined;
}
