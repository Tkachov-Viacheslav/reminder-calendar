import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-sky-500 shrink-0" />,
};

const BORDERS = {
  success: 'border-emerald-500/20 bg-emerald-950/80 text-emerald-100',
  error: 'border-rose-500/20 bg-rose-950/80 text-rose-100',
  warning: 'border-amber-500/20 bg-amber-950/80 text-amber-100',
  info: 'border-sky-500/20 bg-sky-950/80 text-sky-100',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const popoverRef = useRef(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success', duration = 3000, action = null) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newToast = { id, message, type, action };

      setToasts((prev) => [...prev.slice(-3), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // Synchronize Top Layer Popover state with toasts
  useEffect(() => {
    const el = popoverRef.current;
    if (!el || !el.showPopover) return;

    if (toasts.length > 0) {
      if (!el.matches?.(':popover-open')) {
        try {
          el.showPopover();
        } catch {}
      }
    } else {
      if (el.matches?.(':popover-open')) {
        try {
          el.hidePopover();
        } catch {}
      }
    }
  }, [toasts.length]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast Notification Container in Top Layer */}
      <div
        ref={popoverRef}
        popover="manual"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 m-0 p-0 bg-transparent border-0 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none overflow-visible backdrop:bg-transparent z-50"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-lg transition-all animate-slideUp text-xs font-medium ${
              BORDERS[toast.type] || BORDERS.info
            }`}
          >
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              {ICONS[toast.type] || ICONS.info}
              <span className="truncate">{toast.message}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action.onClick();
                    removeToast(toast.id);
                  }}
                  className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="Закрити сповіщення"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { showToast: () => {}, removeToast: () => {} };
  }
  return context;
}
