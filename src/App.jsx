import React, { useState } from 'react';
import { TelegramProvider, useTelegram } from './context/TelegramContext';
import { ReminderProvider, useReminders } from './context/ReminderContext';
import { Header } from './components/Header';
import { CalendarHeader } from './components/Calendar/CalendarHeader';
import { MonthView } from './components/Calendar/MonthView';
import { ReminderList } from './components/Reminders/ReminderList';
import { ReminderModal } from './components/Reminders/ReminderModal';
import { TelegramStatusModal } from './components/Telegram/TelegramStatusModal';
import { SetupModal } from './components/SetupGuide/SetupModal';
import { isSupabaseConfigured } from './services/supabase';
import { Info, Sparkles } from 'lucide-react';

function CalendarContent() {
  const { viewDate, setViewDate, selectedDate, setSelectedDate, reminders, addReminder } = useReminders();
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setViewDate(today);
    setSelectedDate(today);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <Header
        onOpenNewReminder={() => setIsReminderModalOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenTelegramSettings={() => setIsTelegramModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* Supabase Local Mode Banner (if not yet configured) */}
        {!isConfigured && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                <strong>Локальний демо-режим:</strong> Події зберігаються у браузері. Підключіть Supabase для автоматичних TG-нагадувань за розкладом.
              </span>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shrink-0 ml-2"
            >
              Інструкція
            </button>
          </div>
        )}

        {/* Calendar and Reminders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Calendar Box */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <CalendarHeader
              viewDate={viewDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onGoToday={handleGoToday}
            />
            <div className="mt-4">
              <MonthView
                viewDate={viewDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                reminders={reminders}
              />
            </div>
          </div>

          {/* Reminders List Box */}
          <div className="lg:col-span-5 h-full">
            <ReminderList onOpenNewReminder={() => setIsReminderModalOpen(true)} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSave={addReminder}
        initialDate={selectedDate}
      />
      <TelegramStatusModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
      <SetupModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TelegramProvider>
      <ReminderProvider>
        <CalendarContent />
      </ReminderProvider>
    </TelegramProvider>
  );
}
