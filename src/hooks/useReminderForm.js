import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_CATEGORY } from '../utils/constants';
import { toISODateString } from '../utils/dateUtils';
import { useTelegram } from '../context/TelegramContext';
import { useReminders } from '../context/ReminderContext';

export function useReminderForm({ isOpen, editingReminder, initialDate, onSave, onClose }) {
  const { triggerHaptic } = useTelegram();
  const { addCustomCategory, deleteCustomCategory } = useReminders();

  const getDefaultTime = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState(() => toISODateString(initialDate || new Date()));
  const [timeStr, setTimeStr] = useState(getDefaultTime);
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [description, setDescription] = useState('');
  const [repeatType, setRepeatType] = useState('none');
  const [remindBefore, setRemindBefore] = useState(0);
  const [items, setItems] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [taggedMembers, setTaggedMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingReminder) {
      setTitle(editingReminder.title || '');
      setDescription(editingReminder.description || '');
      setCategory(editingReminder.category || DEFAULT_CATEGORY);
      setRepeatType(editingReminder.repeat_type || 'none');
      setItems(Array.isArray(editingReminder.items) ? editingReminder.items : []);
      setThreadId(editingReminder.thread_id || null);
      setTaggedMembers(Array.isArray(editingReminder.tagged_members) ? editingReminder.tagged_members : []);
      const remindBeforeVal = editingReminder.remind_before || 0;
      setRemindBefore(remindBeforeVal);
      const remDate = new Date(editingReminder.remind_at);
      if (remindBeforeVal) {
        remDate.setTime(remDate.getTime() + Number(remindBeforeVal) * 60 * 1000);
      }
      setDateStr(toISODateString(remDate));
      setTimeStr(`${String(remDate.getHours()).padStart(2, '0')}:${String(remDate.getMinutes()).padStart(2, '0')}`);
    } else {
      setTitle('');
      setDescription('');
      setCategory(DEFAULT_CATEGORY);
      setRepeatType('none');
      setRemindBefore(0);
      setItems([]);
      setThreadId(null);
      setTaggedMembers([]);
      setDateStr(toISODateString(initialDate || new Date()));
      setTimeStr(getDefaultTime());
    }
    setError('');
  }, [isOpen, editingReminder, initialDate]);

  const handleToggleMemberTag = useCallback((member) => {
    const memberId = String(member.telegram_id);
    setTaggedMembers((prev) => {
      const isTagged = prev.some((m) => m.id === memberId);
      if (isTagged) return prev.filter((m) => m.id !== memberId);
      return [...prev, { id: memberId, name: member.first_name || '', username: member.username || '' }];
    });
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleAddCustomTag = useCallback((tagText) => {
    const cleanUsername = tagText.replace(/^@/, '');
    setTaggedMembers((prev) => [...prev, { id: '', name: tagText, username: cleanUsername }]);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleRemoveTagged = useCallback((idx) => {
    triggerHaptic('light');
    setTaggedMembers((prev) => prev.filter((_, i) => i !== idx));
  }, [triggerHaptic]);

  const handleAddItem = useCallback((text) => {
    setItems((prev) => [
      ...prev,
      { id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, done: false },
    ]);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleToggleItem = useCallback((id) => {
    triggerHaptic('light');
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  }, [triggerHaptic]);

  const handleDeleteItem = useCallback((id) => {
    triggerHaptic('light');
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, [triggerHaptic]);

  const handleAddCategory = useCallback(async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === 'головне' || trimmed.toLowerCase() === 'main') {
      setCategory('main');
      return;
    }
    if (trimmed.toLowerCase() === 'інше' || trimmed.toLowerCase() === 'other') {
      setCategory('other');
      return;
    }
    await addCustomCategory(trimmed);
    setCategory(trimmed);
    triggerHaptic('light');
  }, [addCustomCategory, triggerHaptic]);

  const handleDeleteCategory = useCallback(async (catToDelete) => {
    await deleteCustomCategory(catToDelete);
    if (category === catToDelete) setCategory(DEFAULT_CATEGORY);
    triggerHaptic('light');
  }, [category, deleteCustomCategory, triggerHaptic]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Будь ласка, вкажіть назву нагадування');
      triggerHaptic('error');
      return;
    }

    if (!dateStr || !timeStr) {
      setError('Будь ласка, вкажіть дату та час');
      triggerHaptic('error');
      return;
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const eventDate = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(eventDate.getTime())) {
      setError('Будь ласка, оберіть коректну дату та час');
      triggerHaptic('error');
      return;
    }

    const remindAtDate = new Date(eventDate.getTime() - Number(remindBefore || 0) * 60 * 1000);
    if (isNaN(remindAtDate.getTime())) {
      setError('Некоректний розрахунок часу нагадування');
      triggerHaptic('error');
      return;
    }

    triggerHaptic('success');
    onSave({
      title: title.trim(),
      description: description.trim(),
      category,
      remind_at: remindAtDate.toISOString(),
      repeat_type: repeatType,
      remind_before: Number(remindBefore || 0),
      items,
      thread_id: threadId ? Number(threadId) : null,
      tagged_members: taggedMembers,
      ...(editingReminder ? { is_sent: false } : {}),
    });

    onClose();
  };

  return {
    title,
    setTitle,
    dateStr,
    setDateStr,
    timeStr,
    setTimeStr,
    category,
    setCategory,
    description,
    setDescription,
    repeatType,
    setRepeatType,
    remindBefore,
    setRemindBefore,
    items,
    threadId,
    setThreadId,
    taggedMembers,
    error,
    setError,
    handleToggleMemberTag,
    handleAddCustomTag,
    handleRemoveTagged,
    handleAddItem,
    handleToggleItem,
    handleDeleteItem,
    handleAddCategory,
    handleDeleteCategory,
    handleSubmit,
  };
}
