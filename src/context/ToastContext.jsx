import React, { createContext, useContext, useState, useCallback } from 'react';
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

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast = { id, message, type };

    setToasts((prev) => [...prev.slice(-3), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border backdrop-blur-md shadow-lg transition-all animate-slideUp text-xs font-medium ${
              BORDERS[toast.type] || BORDERS.info
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {ICONS[toast.type] || ICONS.info}
              <span className="truncate">{toast.message}</span>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
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
