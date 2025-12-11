import {create} from 'zustand';
import backendHost from '../../constants/backendHost.js';

const initialState = {
  APISchema: null,
  isLoading: false,
  error: null,
};

const useAPISchemaStore = create((set) => ({
  ...initialState,
  setAPISchema: (APISchema) => {
    set(() => ({APISchema}));
  },
  fetchAPISchema: async () => {
    set({isLoading: true, error: null});
    try {
      const response = await fetch(`${backendHost}/openapi.json`);
      const data = await response.json();
      set({APISchema: data, isLoading: false});
      return response.data;
    } catch (error) {
      set({error, isLoading: false});
      console.error('Failed to fetch API schema:', error);
    }
  },
}));

// Fetch schema immediately when the store is created
useAPISchemaStore.getState().fetchAPISchema();

export default useAPISchemaStore;
