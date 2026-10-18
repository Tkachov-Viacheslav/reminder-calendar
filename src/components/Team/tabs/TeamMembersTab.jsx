import React from 'react';

export function TeamMembersTab({ teamMembers, updateMemberRole }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Керуйте правами доступу окремих учасників чату:
      </p>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="py-2.5 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold shrink-0">
                {[...(member.first_name || 'U')][0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {member.first_name || 'Користувач'}
                </div>
                {member.username && (
                  <div className="text-slate-400 text-[11px] truncate">
                    @{member.username}
                  </div>
                )}
              </div>
            </div>

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
          </div>
        ))}
      </div>
    </div>
  );
}
