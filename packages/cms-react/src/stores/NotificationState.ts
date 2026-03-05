import { create } from 'zustand';

/**
 * Notification type variants
 */
type NotificationType = 'info' | 'success' | 'error' | 'warning';

interface NotificationState {
  open: boolean;
  message: string;
  type: NotificationType;
  duration: number;
  setOpen: (open: boolean) => void;
  notify: (params: { message: string; type: NotificationType; duration?: number }) => void;
}

const NOTIFICATION_DEFAULT_DURATION_MS = 3000;

/**
 * Global notification store for displaying toast/snackbar messages
 */
export const NotificationState = create<NotificationState>((set) => ({
  open: false,
  message: '',
  type: 'info',
  duration: NOTIFICATION_DEFAULT_DURATION_MS,
  setOpen: (open) => set(() => ({ open })),
  notify: ({ message, type, duration = NOTIFICATION_DEFAULT_DURATION_MS }) =>
    set(() => ({
      message,
      open: true,
      type,
      duration,
    })),
}));
