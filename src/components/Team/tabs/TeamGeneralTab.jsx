import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Input, Select } from '../../ui';

export function TeamGeneralTab({ currentTeam, updateTeamSettings }) {
  const [teamTitle, setTeamTitle] = useState(currentTeam?.title || '');
  const [defaultRole, setDefaultRole] = useState(currentTeam?.default_role || 'editor');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    await updateTeamSettings({
      title: teamTitle.trim() || currentTeam.title,
      default_role: defaultRole,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs sm:text-sm">
      <Input
        label="Назва команди"
        value={teamTitle}
        onChange={(e) => setTeamTitle(e.target.value)}
      />

      <Select
        label="Базова роль для нових учасників"
        value={defaultRole}
        onChange={(e) => setDefaultRole(e.target.value)}
      >
        <option value="editor">Редактор (може створювати нагадування)</option>
        <option value="viewer">Переглядач (лише перегляд)</option>
      </Select>

      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Telegram Chat ID:</span>
          <code className="text-indigo-600 dark:text-indigo-400 font-mono">
            {currentTeam.telegram_chat_id}
          </code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">Тип чату:</span>
          <span>{currentTeam.is_forum ? 'Форум (із темами)' : 'Звичайна група'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {savedSuccess && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Збережено успішно
          </span>
        )}
        <Button type="submit" variant="primary" className="ml-auto">
          Зберегти зміни
        </Button>
      </div>
    </form>
  );
}
