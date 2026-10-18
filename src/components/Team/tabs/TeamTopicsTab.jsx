import React, { useState } from 'react';
import { Hash, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '../../ui';

export function TeamTopicsTab({
  teamTopics,
  addTeamTopic,
  deleteTeamTopic,
  allCategories,
  categoryTopics,
  setCategoryTopicMapping,
  isTeamAdmin = false,
}) {
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicThreadId, setNewTopicThreadId] = useState('');

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicThreadId) return;
    await addTeamTopic(newTopicName.trim(), Number(newTopicThreadId));
    setNewTopicName('');
    setNewTopicThreadId('');
    setIsAddingTopic(false);
  };

  return (
    <div className="space-y-4">
      {/* Help Banner */}
      <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          Як підключити гілки (теми) форуму
        </p>
        <p className="text-[11px] leading-relaxed">
          Через політику Telegram бот не може автоматично просканувати старі теми без дій у них.
          Щоб зафіксувати тему:
        </p>
        <ul className="text-[11px] list-disc list-inside space-y-0.5 text-indigo-800 dark:text-indigo-300">
          <li>Адміністратор пише в темі чату <code>/topic Назва теми</code></li>
          <li>Або <code>/bind назва_категорії</code> для миттєвої прив'язки</li>
          <li>Або додайте тему вручну за її ID нижче</li>
        </ul>
      </div>

      {/* Topics Header & Add Action */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-violet-500" />
            <span>Відомі теми форуму ({teamTopics.length})</span>
          </h4>
          {isTeamAdmin && !isAddingTopic && (
            <button
              type="button"
              onClick={() => setIsAddingTopic(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>Додати тему</span>
            </button>
          )}
        </div>

        {/* Add Topic Inline Form */}
        {isAddingTopic && (
          <form
            onSubmit={handleCreateTopic}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
          >
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Назва теми"
                placeholder="Наприклад: Завдання"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                required
              />
              <Input
                label="ID гілки (message_thread_id)"
                type="number"
                placeholder="Наприклад: 2"
                value={newTopicThreadId}
                onChange={(e) => setNewTopicThreadId(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIsAddingTopic(false);
                  setNewTopicName('');
                  setNewTopicThreadId('');
                }}
              >
                Скасувати
              </Button>
              <Button type="submit" variant="primary" size="xs">
                Зберегти тему
              </Button>
            </div>
          </form>
        )}

        {/* Topics Badges List */}
        {teamTopics.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {teamTopics.map((top) => (
              <span
                key={top.id}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 text-violet-800 dark:text-violet-200 text-xs font-medium"
              >
                <span>#{top.name}</span>
                {isTeamAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteTeamTopic(top.id)}
                    className="hover:text-rose-500 p-0.5"
                    title="Видалити тему"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            Теми ще не зафіксовані. Напишіть у темі чату /topic Назва або додайте тему вище.
          </p>
        )}
      </div>

      {/* Category mapping */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
          Прив'язка категорій нагадувань
        </h4>
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {allCategories.map((cat) => {
            const currentThread = categoryTopics[cat.id.toLowerCase()] || 0;
            return (
              <div
                key={cat.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  #{cat.label}
                </span>
                <select
                  disabled={!isTeamAdmin}
                  value={currentThread}
                  onChange={(e) => setCategoryTopicMapping(cat.id, e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px] ${
                    !isTeamAdmin ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="0">Загальний чат / За замовчуванням</option>
                  {teamTopics.map((topic) => (
                    <option key={topic.id} value={topic.thread_id}>
                      #{topic.name || `Тема ${topic.thread_id}`}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
