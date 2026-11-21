import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message, type = 'success') => {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list.slice(-3), { id, message, type }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`toast toast-${t.type}`}
              role={t.type === 'error' ? 'alert' : 'status'}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t.message}</span>
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
