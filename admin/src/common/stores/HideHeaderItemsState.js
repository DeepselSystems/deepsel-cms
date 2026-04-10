import { create } from 'zustand';

const HideHeaderItemsState = create((set) => ({
  hideNotifications: false,
  setHideNotifications: (hide) => set({ hideNotifications: hide }),
  hideProfileDropdown: false,
  setHideProfileDropdown: (hide) => set({ hideProfileDropdown: hide }),
  hideGoToSite: false,
  setHideGoToSite: (hide) => set({ hideGoToSite: hide }),
}));

export default HideHeaderItemsState;
