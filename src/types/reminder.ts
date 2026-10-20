export type RepeatType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface ChecklistItem {
  id?: string;
  text: string;
  done: boolean;
}

export interface TaggedMember {
  id?: string | number;
  telegram_id?: string;
  username?: string;
  name?: string;
}

export interface Reminder {
  id: string;
  user_id?: string | null;
  team_id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  remind_at: string;
  remind_before?: number | null;
  repeat_type?: RepeatType;
  is_sent?: boolean;
  items?: ChecklistItem[];
  tagged_members?: TaggedMember[];
  created_by_name?: string | null;
  thread_id?: number | null;
  created_at?: string;
  updated_at?: string;
}
