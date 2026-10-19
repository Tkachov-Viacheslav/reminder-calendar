import React from 'react';
import { Calendar, Pencil, Check } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { useTeam } from '../../context/TeamContext';
import { useReminders } from '../../context/ReminderContext';
import { useReminderForm } from '../../hooks/useReminderForm';
import { useReminderTemplates } from '../../hooks/useReminderTemplates';
import { Modal, Button, Input, Select } from '../ui';
import { CategoryChips } from './CategoryChips';
import { ChecklistEditor } from './ChecklistEditor';
import { TeamMetaEditor } from './TeamMetaEditor';
import { TemplateSelector } from './TemplateSelector';

export function ReminderModal({
  isOpen,
  onClose,
  onSave,
  initialDate,
  editingReminder,
}) {
  const { triggerHaptic, setClosingConfirmation, activeUserId } = useTelegram();
  const { currentTeam, teamMembers, teamTopics, categoryTopics } = useTeam();
  const { customCategories } = useReminders();

  React.useEffect(() => {
    if (isOpen) {
      setClosingConfirmation?.(true);
      return () => setClosingConfirmation?.(false);
    }
  }, [isOpen, setClosingConfirmation]);

  const form = useReminderForm({
    isOpen,
    editingReminder,
    initialDate,
    categoryTopics,
    onSave,
    onClose,
  });

  const { templates, saveTemplate, deleteTemplate, isTeamTemplates } = useReminderTemplates(
    currentTeam?.id,
    activeUserId
  );

  const handleSaveCurrentAsTemplate = (overwriteId = null) => {
    saveTemplate(
      {
        title: form.title,
        category: form.category,
        description: form.description,
        remindBefore: form.remindBefore,
        repeatType: form.repeatType,
        items: form.items,
        timeStr: form.timeStr,
        taggedMembers: form.taggedMembers,
      },
      overwriteId ? { overwriteId } : {}
    );
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReminder ? 'Редагувати подію' : 'Нове нагадування'}
      icon={
        editingReminder ? (
          <Pencil className="w-4 h-4 text-indigo-500" />
        ) : (
          <Calendar className="w-4 h-4 text-indigo-500" />
        )
      }
      maxWidth="max-w-md"
    >
      <form onSubmit={form.handleSubmit} className="p-4 space-y-3.5">
        {form.error && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-medium border border-rose-200 dark:border-rose-900">
            {form.error}
          </div>
        )}

        {/* User Created Templates */}
        {!editingReminder && (
          <TemplateSelector
            templates={templates}
            onApplyTemplate={form.applyTemplate}
            onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
            onDeleteTemplate={deleteTemplate}
            currentTitle={form.title}
            isTeam={isTeamTemplates}
          />
        )}

        {/* Title */}
        <Input
          label="Назва події *"
          required
          value={form.title}
          onChange={(e) => {
            form.setTitle(e.target.value);
            if (form.error) form.setError('');
          }}
          placeholder="Наприклад: Зустріч з клієнтом або Прийом ліків"
        />

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label="Дата"
            type="date"
            required
            value={form.dateStr}
            onChange={(e) => form.setDateStr(e.target.value)}
          />
          <Input
            label="Час нагадування"
            type="time"
            required
            value={form.timeStr}
            onChange={(e) => form.setTimeStr(e.target.value)}
          />
        </div>

        {/* Remind Before & Repeat */}
        <div className="grid grid-cols-2 gap-2.5">
          <Select
            label="Попередження"
            value={form.remindBefore}
            onChange={(e) => form.setRemindBefore(Number(e.target.value))}
          >
            <option value={0}>Вчасно</option>
            <option value={15}>За 15 хв</option>
            <option value={30}>За 30 хв</option>
            <option value={60}>За 1 год</option>
            <option value={1440}>За 1 день</option>
          </Select>

          <Select
            label="Повторення"
            value={form.repeatType}
            onChange={(e) => form.setRepeatType(e.target.value)}
          >
            <option value="none">Не повторювати</option>
            <option value="daily">Щодня</option>
            <option value="weekdays">Щобудня (Пн–Пт)</option>
            <option value="weekly">Щотижня</option>
            <option value="monthly">Щомісяця</option>
          </Select>
        </div>

        {/* Categories */}
        <CategoryChips
          category={form.category}
          onSelectCategory={form.handleSelectCategory}
          customCategories={customCategories}
          onAddCustomCategory={form.handleAddCategory}
          onDeleteCustomCategory={form.handleDeleteCategory}
        />

        {/* Subtasks / Checklist */}
        <ChecklistEditor
          items={form.items}
          onAddItem={form.handleAddItem}
          onToggleItem={form.handleToggleItem}
          onDeleteItem={form.handleDeleteItem}
        />

        {/* Team fields (Forum topic & Tagged members) */}
        <TeamMetaEditor
          currentTeam={currentTeam}
          teamTopics={teamTopics}
          teamMembers={teamMembers}
          threadId={form.threadId}
          setThreadId={form.handleSelectThreadId}
          taggedMembers={form.taggedMembers}
          onToggleMemberTag={form.handleToggleMemberTag}
          onRemoveTagged={form.handleRemoveTagged}
          onAddCustomTag={form.handleAddCustomTag}
        />

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Опис чи нотатка (необов'язково)
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => form.setDescription(e.target.value)}
            placeholder="Додаткові деталі, посилання або контакти..."
            className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 resize-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={form.isSubmitting}>
            Скасувати
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={form.isSubmitting}
            disabled={form.isSubmitting}
            icon={<Check className="w-4 h-4" />}
          >
            {editingReminder ? 'Зберегти зміни' : 'Зберегти нагадування'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
