import React, { useState } from 'react';
import { Users, Settings2, Hash } from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { useTeam } from '../../context/TeamContext';
import { useReminders } from '../../context/ReminderContext';
import { SYSTEM_CATEGORIES } from '../../utils/constants';
import { Modal } from '../ui';
import { TeamGeneralTab } from './tabs/TeamGeneralTab';
import { TeamMembersTab } from './tabs/TeamMembersTab';
import { TeamTopicsTab } from './tabs/TeamTopicsTab';

export function TeamSettingsModal({ isOpen, onClose }) {
  const { setClosingConfirmation } = useTelegram();
  const {
    currentTeam,
    teamMembers,
    teamTopics,
    categoryTopics,
    updateTeamSettings,
    updateMemberRole,
    setCategoryTopicMapping,
    addTeamTopic,
    deleteTeamTopic,
  } = useTeam();
  const { customCategories } = useReminders();

  const [activeTab, setActiveTab] = useState('general');

  React.useEffect(() => {
    if (isOpen) {
      setClosingConfirmation?.(true);
      return () => setClosingConfirmation?.(false);
    }
  }, [isOpen, setClosingConfirmation]);

  if (!isOpen || !currentTeam) return null;

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentTeam.title}
      icon={<Settings2 className="w-5 h-5" />}
      maxWidth="max-w-lg"
    >
      <div>
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
        <div className="p-4 space-y-4">
          {activeTab === 'general' && (
            <TeamGeneralTab
              currentTeam={currentTeam}
              updateTeamSettings={updateTeamSettings}
            />
          )}

          {activeTab === 'members' && (
            <TeamMembersTab
              teamMembers={teamMembers}
              updateMemberRole={updateMemberRole}
            />
          )}

          {activeTab === 'topics' && (
            <TeamTopicsTab
              teamTopics={teamTopics}
              addTeamTopic={addTeamTopic}
              deleteTeamTopic={deleteTeamTopic}
              allCategories={allCategories}
              categoryTopics={categoryTopics}
              setCategoryTopicMapping={setCategoryTopicMapping}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
