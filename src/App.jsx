import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TelegramProvider, useTelegram } from './context/TelegramContext';
import { TeamProvider, useTeam } from './context/TeamContext';
import { ReminderProvider, useReminders } from './context/ReminderContext';
import { useReminderTemplates } from './hooks/useReminderTemplates';
import { Header } from './components/Header';
import { CalendarHeader } from './components/Calendar/CalendarHeader';
import { MonthView } from './components/Calendar/MonthView';
import { ReminderList } from './components/Reminders/ReminderList';
import { isSupabaseConfigured } from './services/supabase';
import { Info, Users, WifiOff, RefreshCw } from 'lucide-react';
import { Card, Badge } from './components/ui';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { useAppBadge } from './hooks/useAppBadge';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Lazy load modals to reduce initial memory footprint and bundle execution
const ReminderModal = lazy(() =>
  import('./components/Reminders/ReminderModal').then((m) => ({ default: m.ReminderModal }))
);
const AuthModal = lazy(() =>
  import('./components/Telegram/AuthModal').then((m) => ({ default: m.AuthModal }))
);
const TeamSettingsModal = lazy(() =>
  import('./components/Team/TeamSettingsModal').then((m) => ({ default: m.TeamSettingsModal }))
);
const PersonalSettingsModal = lazy(() =>
  import('./components/common/PersonalSettingsModal').then((m) => ({ default: m.PersonalSettingsModal }))
);
const AiPlannerModal = lazy(() =>
  import('./components/AI/AiPlannerModal').then((m) => ({ default: m.AiPlannerModal }))
);

function CalendarContent() {
  const {
    viewDate,
    setViewDate,
    selectedDate,
    setSelectedDate,
    reminders,
    addReminder,
    updateReminder,
    isOnline,
    pendingSyncCount,
    customCategories,
  } = useReminders();
  const { currentTeam, canEdit, teamMembers, categoryTopics } = useTeam();
  const { activeUserId } = useTelegram();
  const { templates } = useReminderTemplates(currentTeam?.id, activeUserId);

  // Synchronize native PWA App Badge with today's pending reminders
  useAppBadge(reminders);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);
  const [isPersonalSettingsOpen, setIsPersonalSettingsOpen] = useState(false);
  const [isAiPlannerOpen, setIsAiPlannerOpen] = useState(false);

  const handleOpenNewReminder = () => {
    setEditingReminder(null);
    setIsReminderModalOpen(true);
  };

  const handleApplyAiReminder = async (data) => {
    try {
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (!item || !item.dateStr || !item.timeStr) continue;
        const [year, month, day] = item.dateStr.split('-').map(Number);
        const [hours, minutes] = item.timeStr.split(':').map(Number);
        const eventDate = new Date(year, month - 1, day, hours, minutes);
        const remindAtDate = new Date(eventDate.getTime() - (item.remindBefore || 0) * 60 * 1000);

        let topicThreadId = null;
        if (currentTeam?.id && categoryTopics?.[item.category]) {
          topicThreadId = categoryTopics[item.category];
        }

        await addReminder({
          title: item.title,
          date: eventDate.toISOString(),
          remind_at: remindAtDate.toISOString(),
          category: item.category || 'main',
          repeat_type: item.repeatType || 'none',
          remind_before: item.remindBefore || 0,
          thread_id: topicThreadId,
          tagged_members: item.taggedMembers || [],
          items: item.items || [],
        });
      }
    } catch (err) {
      console.error('Failed to apply AI reminder:', err);
    }
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setIsReminderModalOpen(true);
  };

  const handleCloseReminderModal = () => {
    setIsReminderModalOpen(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = async (data) => {
    if (editingReminder) {
      await updateReminder(editingReminder.id, data);
    } else {
      await addReminder(data);
    }
    setEditingReminder(null);
  };

  const transitionViewDate = (newDate, updateSelected = false) => {
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      document.startViewTransition(() => {
        setViewDate(newDate);
        if (updateSelected) setSelectedDate(newDate);
      });
    } else {
      setViewDate(newDate);
      if (updateSelected) setSelectedDate(newDate);
    }
  };

  const handlePrevMonth = () => {
    transitionViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    transitionViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    transitionViewDate(new Date(), true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'new') {
      handleOpenNewReminder();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (action === 'today') {
      handleGoToday();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Header
        onOpenNewReminder={handleOpenNewReminder}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenTeamSettings={() => setIsTeamSettingsOpen(true)}
        onOpenPersonalSettings={() => setIsPersonalSettingsOpen(true)}
        onOpenAiPlanner={() => setIsAiPlannerOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Offline & Sync Status Banner */}
        {!isOnline && (
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
              <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Офлайн-режим:</strong> Зміни зберігаються на пристрої.
                {pendingSyncCount > 0 && ` Очікує синхронізації: ${pendingSyncCount}.`}
              </span>
            </div>
            {pendingSyncCount > 0 && (
              <Badge variant="amber" size="sm">
                Очікує: {pendingSyncCount}
              </Badge>
            )}
          </div>
        )}

        {isOnline && pendingSyncCount > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 text-xs animate-pulse">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
              <span>Синхронізація збережених офлайн-змін... ({pendingSyncCount})</span>
            </div>
          </div>
        )}

        {/* Supabase Local Mode Banner (if not yet configured) */}
        {!isConfigured && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                <strong>Локальний демо-режим:</strong> Події зберігаються у браузері.
              </span>
            </div>
          </div>
        )}

        {/* Active Team Workspace Banner */}
        {currentTeam && (
          <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-violet-50/90 dark:bg-violet-950/50 border border-violet-200/80 dark:border-violet-900/60 text-xs overflow-hidden">
            <div className="flex items-center gap-2 text-violet-950 dark:text-violet-200 min-w-0 flex-1">
              <Users className="w-4 h-4 text-violet-500 shrink-0" />
              <span className="truncate">
                Командний календар: <strong className="font-semibold">{currentTeam.title}</strong>
                {!canEdit && ' (Режим перегляду)'}
              </span>
            </div>
          </div>
        )}

        {/* Calendar and Reminders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Calendar Box */}
          <Card className="lg:col-span-7">
            <CalendarHeader
              viewDate={viewDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
            />
            <div className="mt-4 calendar-view-container">
              <MonthView
                viewDate={viewDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                reminders={reminders}
              />
            </div>
          </Card>

          {/* Reminders List Box */}
          <div className="lg:col-span-5 h-full">
            <ReminderList
              onOpenNewReminder={handleOpenNewReminder}
              onEditReminder={handleEditReminder}
            />
          </div>
        </div>
      </main>

      {/* Modals with lazy loading and conditional rendering */}
      <Suspense fallback={null}>
        {isReminderModalOpen && (
          <ReminderModal
            isOpen={isReminderModalOpen}
            onClose={handleCloseReminderModal}
            onSave={handleSaveReminder}
            initialDate={selectedDate}
            editingReminder={editingReminder}
          />
        )}
        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}
        {isTeamSettingsOpen && (
          <TeamSettingsModal
            isOpen={isTeamSettingsOpen}
            onClose={() => setIsTeamSettingsOpen(false)}
          />
        )}
        {isPersonalSettingsOpen && (
          <PersonalSettingsModal
            isOpen={isPersonalSettingsOpen}
            onClose={() => setIsPersonalSettingsOpen(false)}
          />
        )}
        {isAiPlannerOpen && (
          <AiPlannerModal
            isOpen={isAiPlannerOpen}
            onClose={() => setIsAiPlannerOpen(false)}
            onApplyReminder={handleApplyAiReminder}
            templates={templates}
            teamMembers={teamMembers}
            categories={customCategories}
            currentWorkspace={currentTeam ? currentTeam.title : 'personal'}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <TelegramProvider>
          <TeamProvider>
            <ReminderProvider>
              <CalendarContent />
              <Analytics />
              <SpeedInsights />
            </ReminderProvider>
          </TeamProvider>
        </TelegramProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
