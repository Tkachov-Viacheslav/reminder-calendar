import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquareHeart,
  Upload,
  Pencil,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { Modal, Button } from '../ui';
import { useTelegram } from '../../context/TelegramContext';
import { submitUserFeedback } from '../../services/feedbackService';
import { ImageEditorModal } from './ImageEditorModal';

export function FeedbackModal({ isOpen, onClose, initialFile = null }) {
  const { user } = useTelegram();
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef(null);

  const handleSetFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      setErrorMessage('Будь ласка, оберіть файл зображення (PNG, JPG, WEBP тощо).');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('Розмір зображення не повинен перевищувати 10 МБ.');
      return;
    }

    setErrorMessage('');
    setFile(selectedFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selectedFile);
    });
  }, []);

  // Ініціалізація даних при відкритті
  useEffect(() => {
    if (isOpen) {
      setName(user?.first_name || '');
      setContact(user?.username ? `@${user.username}` : '');
      setErrorMessage('');
      setIsSuccess(false);
      if (initialFile) {
        handleSetFile(initialFile);
      }
    }
  }, [isOpen, user, initialFile, handleSetFile]);

  // Очищення URL прев'ю при розмонтуванні
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Вставка зображення з буфера обміну (Ctrl+V / Paste)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            e.preventDefault();
            handleSetFile(files[i]);
            return;
          }
        }
      }

      const items = e.clipboardData?.items;
      if (items && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const pasted = items[i].getAsFile();
            if (pasted) {
              e.preventDefault();
              handleSetFile(pasted);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, handleSetFile]);

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) handleSetFile(droppedFile);
  };

  const handleCloseSuccess = () => {
    handleRemoveFile();
    setMessage('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) {
      setErrorMessage('Будь ласка, вкажіть опис проблеми або відгуку.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await submitUserFeedback({
      message,
      name,
      contact,
      file,
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      // Відображення успіху на 12 секунд (на 10 секунд довше) з можливістю закрити раніше
      setTimeout(() => {
        handleCloseSuccess();
      }, 12000);
    } else {
      setErrorMessage(res.error || 'Не вдалося надіслати звіт.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Повідомити про проблему або відгук"
        icon={<MessageSquareHeart className="w-5 h-5 text-indigo-500" />}
        maxWidth="max-w-md"
      >
        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Дякуємо за ваш відгук!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Звіт успішно надіслано! Дякуємо за допомогу в покращенні сервісу.
            </p>
            <div className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseSuccess}
              >
                Закрити зараз
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Message Textarea */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Опис проблеми або побажання <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Що пішло не так або яку функцію додати? Можна вставити скріншот через Ctrl+V..."
                rows={4}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Name & Contact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Ваше ім'я
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ім'я"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Telegram / контакт
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="@username або email"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Attachment Controls */}
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Скріншот або файл</span>
                {file && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {(file.size / 1024).toFixed(1)} КБ
                  </span>
                )}
              </label>

              {previewUrl ? (
                <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-2 flex items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Скріншот"
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {file?.name || 'screenshot.png'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Натисніть «Редагувати» або хрестик для заміни
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold text-xs transition-colors"
                      title="Редагувати зображення (малювати, рамка, приховати дані)"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Редагувати</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-rose-500 transition-colors"
                      title="Видалити скріншот"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSetFile(e.target.files?.[0])}
                    className="hidden"
                  />

                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-4 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <Upload className="w-5 h-5 mx-auto text-indigo-500 mb-1" />
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      Перетягніть файл сюди або клікніть для вибору
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Можна також вставити з буфера через Ctrl+V (до 10 МБ)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit & Cancel Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                Скасувати
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !message.trim()}
                icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Надсилання...' : 'Надіслати відгук'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Image Editor Submodal */}
      {isEditorOpen && file && (
        <ImageEditorModal
          isOpen={isEditorOpen}
          imageFile={file}
          onClose={() => setIsEditorOpen(false)}
          onSave={(editedFile) => {
            handleSetFile(editedFile);
            setIsEditorOpen(false);
          }}
        />
      )}
    </>
  );
}
