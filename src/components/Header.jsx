import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  KeyRound,
  Plus,
  ChevronDown,
  User,
  Users,
  Settings,
  Check,
} from 'lucide-react';
import { useTelegram } from '../context/TelegramContext';
import { useTeam } from '../context/TeamContext';
import { Button } from './ui';

export function Header({ onOpenNewReminder, onOpenAuth, onOpenTeamSettings }) {
  const { user, isAuthenticated } = useTelegram();
  const {
    userTeams,
    activeTeamId,
    currentTeam,
    isTeamAdmin,
    canEdit,
    switchWorkspace,
  } = useTeam();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and Workspace Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>

          <div className="relative" ref={switcherRef}>
            <button
              onClick={() => setIsSwitcherOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
            >
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Простір
                </div>
                <div className="font-bold text-sm sm:text-base flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">
                    {currentTeam ? currentTeam.title : 'Особистий'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isSwitcherOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn text-xs">
                {/* Personal Option */}
                <button
                  onClick={() => {
                    switchWorkspace(null);
                    setIsSwitcherOpen(false);
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
                        onClick={() => {
                          switchWorkspace(team.id);
                          setIsSwitcherOpen(false);
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
            )}
          </div>

          {/* Team Settings Gear (if in team and admin) */}
          {currentTeam && isTeamAdmin && (
            <button
              onClick={onOpenTeamSettings}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all"
              title="Налаштування команди"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action badges and buttons */}
        <div className="flex items-center gap-2">
          {/* Auth / Profile button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isAuthenticated
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100'
            }`}
            title={isAuthenticated ? 'Мій профіль' : 'Увійти через Telegram'}
          >
            {isAuthenticated ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="max-w-[100px] sm:max-w-[130px] truncate">
                  {user?.first_name || 'Профіль'}
                </span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Увійти</span>
              </>
            )}
          </button>

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
