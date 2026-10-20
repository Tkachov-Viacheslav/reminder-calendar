import React, { useState, useRef, useEffect } from 'react';
import {
  KeyRound,
  Plus,
  ChevronDown,
  User,
  Users,
  Settings,
  Check,
  Sparkles,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTeam } from '../context/TeamContext';
import { Button } from './ui';

export function Header({
  onOpenNewReminder,
  onOpenAuth,
  onOpenTeamSettings,
  onOpenPersonalSettings,
  onOpenAiPlanner,
}) {
  const { user, isAuthenticated } = useTelegram();
  const {
    userTeams,
    activeTeamId,
    currentTeam,
    isTeamAdmin,
    canEdit,
    switchWorkspace,
  } = useTeam();
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });

  const toggleSwitcher = () => {
    const popover = popoverRef.current;
    const button = buttonRef.current;
    if (!popover || !button) return;

    if (popover.matches?.(':popover-open')) {
      popover.hidePopover?.();
    } else {
      const rect = button.getBoundingClientRect();
      setPopoverCoords({ top: rect.bottom + 8, left: rect.left });
      popover.showPopover?.();
    }
  };

  const closeSwitcher = () => {
    popoverRef.current?.hidePopover?.();
  };

  return (
    <header className="app-header sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Logo and Workspace Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <img
            src="/favicon.svg"
            alt="Нагадування"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-md shadow-indigo-500/20 shrink-0 select-none object-contain"
          />

          <div className="relative min-w-0 max-w-[150px] xs:max-w-[180px] sm:max-w-[240px]">
            <button
              ref={buttonRef}
              type="button"
              onClick={toggleSwitcher}
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
            >
              <div className="leading-tight min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Простір
                </div>
                <div className="font-bold text-xs sm:text-sm md:text-base flex items-center gap-1 text-slate-900 dark:text-slate-100 min-w-0">
                  <span className="truncate block">
                    {currentTeam ? currentTeam.title : 'Особистий'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              </div>
            </button>

            {/* Native Popover Menu */}
            <div
              ref={popoverRef}
              id="workspace-switcher-popover"
              popover="auto"
              style={{ top: `${popoverCoords.top}px`, left: `${popoverCoords.left}px` }}
              className="fixed m-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 text-xs backdrop:bg-transparent"
            >
              {/* Personal Option */}
              <button
                type="button"
                onClick={() => {
                  switchWorkspace(null);
                  closeSwitcher();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                  !activeTeamId
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Особистий календар</span>
                </div>
                {!activeTeamId && <Check className="w-4 h-4 text-indigo-600" />}
              </button>

              {/* Teams List */}
              {userTeams.length > 0 && (
                <>
                  <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Команди
                  </div>
                  {userTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => {
                        switchWorkspace(team.id);
                        closeSwitcher();
                      }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                          activeTeamId === team.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Users className="w-4 h-4 text-violet-500 shrink-0" />
                          <span className="truncate">{team.title}</span>
                        </div>
                        {activeTeamId === team.id && <Check className="w-4 h-4 text-indigo-600" />}
                      </button>
                    ))}
                </>
              )}
            </div>
          </div>

          {/* Settings Gear: Team settings if in team (admin), or Personal settings in personal calendar */}
          {currentTeam ? (
            isTeamAdmin && (
              <button
                onClick={onOpenTeamSettings}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
                title="Налаштування команди"
              >
                <Settings className="w-4 h-4" />
              </button>
            )
          ) : (
            <button
              onClick={onOpenPersonalSettings}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
              title="Налаштування категорій та календаря"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action badges and buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Auth / Profile button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
            }`}
            title={isAuthenticated ? 'Мій профіль' : 'Увійти через Telegram'}
          >
            {isAuthenticated ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="max-w-[75px] xs:max-w-[100px] sm:max-w-[130px] truncate">
                  {user?.first_name || 'Профіль'}
                </span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Увійти</span>
              </>
            )}
          </button>

          {/* AI Quick Planner button (hidden if viewer) */}
          {canEdit && (
            <button
              type="button"
              onClick={onOpenAiPlanner}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm shadow-indigo-500/20 active:scale-95 transition-all"
              title="ШІ-планувальник розкладу (Gemini)"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
              <span className="hidden sm:inline">ШІ</span>
            </button>
          )}

          {/* Quick add button (hidden if viewer) */}
          {canEdit && (
            <Button
              onClick={onOpenNewReminder}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Додати</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
