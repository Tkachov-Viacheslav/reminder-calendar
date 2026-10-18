import React, { useState } from 'react';
import { X, Users, Settings2, Hash, Check, MessageSquare } from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { useReminders } from '../../context/ReminderContext';
import { SYSTEM_CATEGORIES } from '../../utils/constants';

export function TeamSettingsModal({ isOpen, onClose }) {
  const {
    currentTeam,
    teamMembers,
    teamTopics,
    categoryTopics,
    updateTeamSettings,
    updateMemberRole,
    setCategoryTopicMapping,
  } = useTeam();
  const { customCategories } = useReminders();

  const [activeTab, setActiveTab] = useState('general');
  const [teamTitle, setTeamTitle] = useState(currentTeam?.title || '');
  const [defaultRole, setDefaultRole] = useState(currentTeam?.default_role || 'editor');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen || !currentTeam) return null;

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    await updateTeamSettings({
      title: teamTitle.trim() || currentTeam.title,
      default_role: defaultRole,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const systemCatList = Object.values(SYSTEM_CATEGORIES).map((c) => ({
    id: c.id,
    label: c.label,
  }));
  const systemKeys = new Set(Object.keys(SYSTEM_CATEGORIES).map((k) => k.toLowerCase()));
  const extraCats = customCategories
    .filter((c) => !systemKeys.has(c.toLowerCase()))
    .map((c) => ({ id: c, label: c }));
  const allCategories = [...systemCatList, ...extraCats];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                Налаштування команди
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
                {currentTeam.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 pt-2 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'general'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Загальні</span>
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Учасники ({teamMembers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === 'topics'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Теми форуму</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Назва команди
                </label>
                <input
                  type="text"
                  value={teamTitle}
                  onChange={(e) => setTeamTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Базова роль для нових учасників
                </label>
                <select
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="editor">Редактор (може створювати нагадування)</option>
                  <option value="viewer">Переглядач (лише перегляд)</option>
                </select>
              </div>

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
                <button
                  type="submit"
                  className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/30"
                >
                  Зберегти зміни
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
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
          )}

          {activeTab === 'topics' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-500" />
                  Прив'язка категорій до гілок форуму
                </p>
                <p className="text-[11px] leading-relaxed">
                  Бот надсилатиме сповіщення відповідної категорії у закріплену тему. Також ви
                  можете написати <code>/bind категорія</code> безпосередньо у темі чату.
                </p>
              </div>

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
                        value={currentThread}
                        onChange={(e) => setCategoryTopicMapping(cat.id, e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[200px]"
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
          )}
        </div>
      </div>
    </div>
  );
}
