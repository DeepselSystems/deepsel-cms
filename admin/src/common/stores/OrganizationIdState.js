import { create } from 'zustand';

const initialState = {
  organizationId: parseInt(localStorage.getItem('organizationId')) || null,
};

export default create((set) => ({
  ...initialState,
  setOrganizationId: (organizationId) => {
    localStorage.setItem('organizationId', organizationId);
    set(() => ({ organizationId }));
  },
}));
