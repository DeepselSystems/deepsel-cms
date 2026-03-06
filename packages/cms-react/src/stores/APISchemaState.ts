import { create } from 'zustand';

/** Raw OpenAPI 3.x schema object */
export type OpenAPISchema = Record<string, unknown>;

interface APISchemaStateShape {
  APISchema: OpenAPISchema | null;
  isLoading: boolean;
  error: unknown;
  setAPISchema: (schema: OpenAPISchema) => void;
  fetchAPISchema: () => Promise<void>;
}

/**
 * Factory that creates an APISchema Zustand store bound to the given backendHost.
 * Immediately triggers a fetch of the OpenAPI schema on creation.
 *
 * Usage in the consuming app:
 *   export const useAPISchemaState = createAPISchemaState(backendHost);
 */
export function createAPISchemaState(backendHost: string) {
  const store = create<APISchemaStateShape>((set) => ({
    APISchema: null,
    isLoading: false,
    error: null,

    setAPISchema: (APISchema) => {
      set(() => ({ APISchema }));
    },

    fetchAPISchema: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await fetch(`${backendHost}/openapi.json`);
        const data = (await response.json()) as OpenAPISchema;
        set({ APISchema: data, isLoading: false });
      } catch (error) {
        set({ error, isLoading: false });
        console.error('Failed to fetch API schema:', error);
      }
    },
  }));

  // Fetch schema immediately when the store is created
  void store.getState().fetchAPISchema();

  return store;
}
