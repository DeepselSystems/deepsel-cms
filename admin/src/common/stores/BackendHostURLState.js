import { create } from 'zustand';
import envBackendHost from '../../constants/backendHost.js';

const initialState = {
  backendHost: localStorage.getItem('backendHost') || envBackendHost,
};

export default create((set) => ({
  ...initialState,
  setBackendHost: (backendHost) => {
    localStorage.setItem('backendHost', backendHost);
    set(() => ({ backendHost }));
  },
  resetDefault: () => set(() => ({ backendHost: envBackendHost })),
}));
