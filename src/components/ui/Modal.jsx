import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { IconButton } from './IconButton';

export function Modal({
  isOpen,
  onClose,
  title,
  icon = null,
  children,
  maxWidth = 'max-w-md',
}) {
  const dialogRef = useRef(null);
  const { setupBackButton } = useTelegram();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      const cleanupBack = setupBackButton(onClose);
      return () => {
        cleanupBack();
        if (dialog.open) dialog.close();
      };
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen, onClose, setupBackButton]);

  // Handle native Escape key
  const handleCancel = (e) => {
    e.preventDefault();
    onClose();
  };

  // Close when clicking the native backdrop outside modal content
  const handleDialogClick = (e) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleDialogClick}
      className={`fixed inset-0 m-auto p-3 sm:p-4 bg-transparent border-0 rounded-2xl w-full ${maxWidth} max-h-[90vh] overflow-visible focus:outline-none z-50`}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] modal-content animate-scaleIn text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                {icon}
              </div>
            )}
            <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h3>
          </div>
          <IconButton
            onClick={onClose}
            icon={<X className="w-5 h-5" />}
            aria-label="Закрити"
            size="sm"
            variant="ghost"
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
}
