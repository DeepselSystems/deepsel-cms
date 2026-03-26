import type { NotifyFn } from "../../../../types";

/**
 * Paste handler options interface.
 * These options are passed via PasteHandler.configure({...}) in RichTextInput.
 */
export interface PasteHandlerOptions {
  enabled?: boolean;
  onPaste?: ((files: File[]) => void) | null;
  HTMLAttributes?: Record<string, unknown>;
  /** Backend API host URL for file uploads */
  backendHost: string;
  /** JWT authentication token for API requests */
  token: string | undefined;
  /**
   * Callback to display toast/snackbar notifications after upload.
   * Sourced from the consuming app's notification store
   * (e.g. `NotificationState.getState().notify`).
   */
  notify?: NotifyFn;
}
