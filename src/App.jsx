import React, { useState, useEffect, lazy, Suspense } from 'react';
import { TelegramProvider } from './context/TelegramContext';
import { TeamProvider, useTeam } from './context/TeamContext';
import { ReminderProvider, useReminders } from './context/ReminderContext';
import { Header } from './components/Header';
import { CalendarHeader } from './components/Calendar/CalendarHeader';
import { MonthView } from './components/Calendar/MonthView';
import { ReminderList } from './components/Reminders/ReminderList';
import { isSupabaseConfigured } from './services/supabase';
import { Info, Users, WifiOff, RefreshCw } from 'lucide-react';
import { Card, Badge } from './components/ui';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';

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
  } = useReminders();
  const { currentTeam, canEdit } = useTeam();
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isTeamSettingsOpen, setIsTeamSettingsOpen] = useState(false);

  const handleOpenNewReminder = () => {
    setEditingReminder(null);
    setIsReminderModalOpen(true);
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
            </ReminderProvider>
          </TeamProvider>
        </TelegramProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
