import { create } from 'zustand';

const ShowSiteSelectorState = create((set) => ({
  hideSiteSelector: false,
  setHideSiteSelector: (hide) => set({ hideSiteSelector: hide }),
}));

export default ShowSiteSelectorState;
