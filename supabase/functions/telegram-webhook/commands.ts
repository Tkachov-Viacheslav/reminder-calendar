// Facade re-exporting modular commands by domain

export { generateAndSaveCode, sendAuthCode } from './commands/auth.ts';

export {
  sendWelcome,
  sendHelp,
  handleTodayCommand,
  handleTomorrowCommand,
  handleWeekCommand,
  handleQuickReminder,
  handleAiReminderMessage,
  handleUserGroupsCommand,
} from './commands/personal.ts';

export {
  handleSyncCommand,
  handleTeamCommand,
  handleAddMemberCommand,
  handleMyChatMemberUpdate,
} from './commands/teams.ts';

export {
  handleBindCommand,
  handleTopicCommand,
} from './commands/forum.ts';

export {
  handleBugReportCommand,
} from './commands/feedback.ts';
