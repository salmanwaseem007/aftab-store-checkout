import { memo, useEffect, useRef } from 'react';
import { useToastStore, Toast as ToastType } from '../stores/useToastStore';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = memo(({ toast }: { toast: ToastType }) => {
  const { removeToast, pauseToast, resumeToast } = useToastStore();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration);

  useEffect(() => {
    const startTimer = () => {
      startTimeRef.current = Date.now();
      timeoutRef.current = setTimeout(() => {
        removeToast(toast.id);
      }, remainingTimeRef.current);
    };

    const clearTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      }
    };

    if (!toast.isPaused) {
      startTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [toast.isPaused, toast.id, removeToast]);

  const handleMouseEnter = () => {
    pauseToast(toast.id);
  };

  const handleMouseLeave = () => {
    resumeToast(toast.id);
  };

  const handleClose = () => {
    removeToast(toast.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Enter') {
      handleClose();
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 shrink-0" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 shrink-0" />;
      case 'info':
        return <Info className="h-5 w-5 shrink-0" />;
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`toast-item toast-${toast.type}`}
    >
      <div className="flex items-start gap-3">
        <div className="toast-icon">{getIcon()}</div>
        <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
        <button
          onClick={handleClose}
          className="toast-close-button"
          aria-label="Cerrar notificación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      aria-label="Notificaciones"
      role="region"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

