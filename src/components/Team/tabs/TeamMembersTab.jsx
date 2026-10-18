import React, { useState } from 'react';
import { UserPlus, Trash2, Clock } from 'lucide-react';
import { Button, Input } from '../../ui';

export function TeamMembersTab({
  teamMembers,
  updateMemberRole,
  addTeamMember,
  removeTeamMember,
  isTeamAdmin,
}) {
  const [newMemberInput, setNewMemberInput] = useState('');

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newMemberInput.trim();
    if (!trimmed || !addTeamMember) return;
    await addTeamMember(trimmed);
    setNewMemberInput('');
  };

  return (
    <div className="space-y-3.5">
      {/* Add Member Form (Admin only) */}
      {isTeamAdmin && addTeamMember && (
        <form onSubmit={handleAddSubmit} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
            Додати учасника чату за юзернеймом (для тегів і завдань):
          </label>
          <div className="flex items-center gap-1.5">
            <Input
              placeholder="Наприклад: @alex_dev або taras"
              value={newMemberInput}
              onChange={(e) => setNewMemberInput(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              size="xs"
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Додати
            </Button>
          </div>
        </form>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Учасники підтягуються автоматично за активністю в чаті або додаються вручну за @username:
      </p>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
        {teamMembers.map((member) => {
          const isPending = String(member.telegram_id).startsWith('@');
          return (
            <div
              key={member.id}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  {[...(member.first_name || member.username || 'U')][0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                    <span>{member.first_name || 'Користувач'}</span>
                    {isPending && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-normal bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50" title="Учасник доданий за @username, очікує першої дії в чаті">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Очікує в чаті</span>
                      </span>
                    )}
                  </div>
                  {member.username && (
                    <div className="text-slate-400 text-[11px] truncate">
                      @{member.username.replace(/^@/, '')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.telegram_id, e.target.value)}
                  className={`px-2 py-1 rounded-lg border text-xs font-medium focus:outline-none ${
                    member.role === 'admin'
                      ? 'border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40'
                      : member.role === 'blocked'
                      ? 'border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <option value="admin">Адмін</option>
                  <option value="editor">Редактор</option>
                  <option value="viewer">Переглядач</option>
                  <option value="blocked">Заблоковано</option>
                </select>

                {isTeamAdmin && removeTeamMember && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.id)}
                    className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                    title="Видалити зі списку команди"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
