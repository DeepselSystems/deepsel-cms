import { create } from 'zustand';

/**
 * Default organization ID fallback when none is stored
 */
const DEFAULT_ORGANIZATION_ID = 1;

interface OrganizationIdState {
  organizationId: number;
  setOrganizationId: (organizationId: number) => void;
}

/**
 * Global store for the active organization ID, persisted to localStorage
 */
export const OrganizationIdState = create<OrganizationIdState>((set) => ({
  organizationId:
    typeof localStorage !== 'undefined'
      ? parseInt(localStorage.getItem('organizationId') ?? '') || DEFAULT_ORGANIZATION_ID
      : DEFAULT_ORGANIZATION_ID,
  setOrganizationId: (organizationId) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('organizationId', String(organizationId));
    }
    set(() => ({ organizationId }));
  },
}));
