export type TeamMemberRole = 'admin' | 'editor' | 'viewer' | 'blocked';

export interface TeamMember {
  id: string;
  team_id: string;
  telegram_id: string;
  first_name?: string;
  username?: string;
  role: TeamMemberRole;
  created_at?: string;
}

export interface Team {
  id: string;
  title: string;
  telegram_chat_id?: string;
  is_forum?: boolean;
  created_by?: string;
  default_role?: TeamMemberRole;
  created_at?: string;
}
