import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  isPaused: boolean;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 2000,
  info: 2000,
  warning: 4000,
  error: 4000,
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (type, message, duration) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? DEFAULT_DURATIONS[type],
      isPaused: false,
    };
    
    set((state) => ({
      toasts: [...state.toasts, toast],
    }));
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
  
  pauseToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, isPaused: true } : toast
      ),
    }));
  },
  
  resumeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, isPaused: false } : toast
      ),
    }));
  },
  
  showSuccess: (message) => {
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        toasts: [
          ...state.toasts,
          {
            id,
            type: 'success',
            message,
            duration: DEFAULT_DURATIONS.success,
            isPaused: false,
          },
        ],
      };
    });
  },
  
  showError: (message) => {
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        toasts: [
          ...state.toasts,
          {
            id,
            type: 'error',
            message,
            duration: DEFAULT_DURATIONS.error,
            isPaused: false,
          },
        ],
      };
    });
  },
  
  showWarning: (message) => {
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        toasts: [
          ...state.toasts,
          {
            id,
            type: 'warning',
            message,
            duration: DEFAULT_DURATIONS.warning,
            isPaused: false,
          },
        ],
      };
    });
  },
  
  showInfo: (message) => {
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return {
        toasts: [
          ...state.toasts,
          {
            id,
            type: 'info',
            message,
            duration: DEFAULT_DURATIONS.info,
            isPaused: false,
          },
        ],
      };
    });
  },
}));
