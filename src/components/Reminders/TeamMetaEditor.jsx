import React, { useState } from 'react';
import { Hash, Users, X } from 'lucide-react';

export function TeamMetaEditor({
  currentTeam,
  teamTopics = [],
  teamMembers = [],
  threadId,
  setThreadId,
  taggedMembers = [],
  onToggleMemberTag,
  onRemoveTagged,
  onAddCustomTag,
}) {
  const [customTagInput, setCustomTagInput] = useState('');

  if (!currentTeam) return null;

  const handleAddTagSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    onAddCustomTag(trimmed);
    setCustomTagInput('');
  };

  return (
    <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-900/40 space-y-3">
      {/* Forum Topic Selector (Only for forum groups) */}
      {currentTeam.is_forum && (
        <div>
          <label className="text-xs font-semibold text-violet-950 dark:text-violet-200 flex items-center gap-1.5 mb-1">
            <Hash className="w-3.5 h-3.5 text-violet-500" />
            <span>Тема форуму (куди надіслати)</span>
          </label>
          <select
            value={threadId || 0}
            onChange={(e) => setThreadId(Number(e.target.value) || null)}
            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100 cursor-pointer"
          >
            <option value="0">За замовчуванням (з прив'язки категорії)</option>
            {teamTopics.map((topic) => (
              <option key={topic.id} value={topic.thread_id}>
                #{topic.name || `Тема ${topic.thread_id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tagged Members */}
      <div>
        <label className="text-xs font-semibold text-violet-950 dark:text-violet-200 flex items-center gap-1.5 mb-1.5">
          <Users className="w-3.5 h-3.5 text-violet-500" />
          <span>Відповідальні (кого тегнути ботом)</span>
        </label>

        {/* Selected chips */}
        {taggedMembers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {taggedMembers.map((tm, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-100 dark:bg-violet-900/50 text-violet-800 dark:text-violet-200 text-xs font-medium"
              >
                <span>{tm.username ? `@${tm.username}` : tm.name}</span>
                <button
                  type="button"
                  onClick={() => onRemoveTagged(idx)}
                  className="hover:text-rose-500 transition-colors"
                  title="Видалити тег"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Autocomplete from known chat members */}
        {teamMembers.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 max-h-20 overflow-y-auto">
            {teamMembers.map((m) => {
              const isSelected = taggedMembers.some(
                (t) => t.id === String(m.telegram_id)
              );
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => onToggleMemberTag(m)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition-colors ${
                    isSelected
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-violet-400'
                  }`}
                >
                  {m.first_name || (m.username ? `@${m.username}` : 'Учасник')}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom tag input */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTagSubmit();
              }
            }}
            placeholder="@username або ім'я..."
            className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={handleAddTagSubmit}
            className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            + Тег
          </button>
        </div>
      </div>
    </div>
  );
}
