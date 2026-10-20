import { LOCAL_STORAGE_USER, LOCAL_STORAGE_ACTIVE_TEAM } from '../utils/constants';
import { supabase, isSupabaseConfigured } from './supabase';

export function getStoredUser() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_USER);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveStoredUser(user) {
  try {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER);
    }
  } catch {}
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_USER);
    localStorage.removeItem(LOCAL_STORAGE_ACTIVE_TEAM);
    if (supabase?.auth) {
      supabase.auth.signOut().catch(() => {});
    }
  } catch {}
}

export function formatTelegramUser(authResult) {
  if (!authResult) return null;
  const u = authResult.user || authResult;
  const userId = u.id ? String(u.id) : (u.sub ? String(u.sub) : '');
  if (!userId) return null;

  const username = (u.preferred_username || u.username || '').replace(/^@/, '');
  const photoUrl = u.picture || u.photo_url || (username ? `https://t.me/i/userpic/320/${username}.jpg` : '');

  return {
    id: String(userId),
    first_name: u.name || u.first_name || '',
    username,
    photo_url: photoUrl,
  };
}

export async function verifyAuthCodeWithApi(code) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const headers = { 'Content-Type': 'application/json' };
  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: String(code).trim() }),
  });
  const data = await res.json();

  if (res.ok && data.ok && data.user) {
    if (data.session && supabase?.auth) {
      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } catch (e) {
        console.warn('Failed to set Supabase auth session:', e);
      }
    }
    const u = data.user;
    const photoUrl = u.photo_url || (u.username ? `https://t.me/i/userpic/320/${u.username}.jpg` : '');
    return { success: true, user: { ...u, photo_url: photoUrl } };
  }

  return { success: false, error: data?.error || 'Невірний код' };
}

export async function verifyInitDataWithApi(initData) {
  if (!initData) return { success: false };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const headers = { 'Content-Type': 'application/json' };
  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ initData }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.user) {
      if (data.session && supabase?.auth) {
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        } catch (e) {
          console.warn('Failed to set Supabase auth session from initData:', e);
        }
      }
      return { success: true, user: data.user };
    }
  } catch {}
  return { success: false };
}

export async function verifyTelegramAuthWithApi(authData) {
  if (!authData) return { success: false, error: 'Дані авторизації відсутні' };
  const hasAuth = Boolean(
    authData.id_token ||
    authData.hash ||
    authData.user?.sub ||
    authData.id
  );
  if (!hasAuth) return { success: false, error: 'Дані авторизації відсутні' };
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dwzswscabsphwprptnos.supabase.co';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const headers = { 'Content-Type': 'application/json' };
  if (anonKey) {
    headers['apikey'] = anonKey;
    headers['Authorization'] = `Bearer ${anonKey}`;
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/verify-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ telegramAuth: authData }),
    });
    const data = await res.json();
    if (res.ok && data.ok && data.user) {
      if (data.session && supabase?.auth) {
        try {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
        } catch (e) {
          console.warn('Failed to set Supabase auth session from telegramAuth:', e);
        }
      }
      return { success: true, user: data.user, session: data.session };
    }
    return { success: false, error: data?.error || 'Помилка авторизації Telegram' };
  } catch {
    return { success: false, error: 'Помилка мережі при авторизації' };
  }
}

export async function healTelegramUserId(user) {
  if (!user?.id || String(user.id).length <= 12 || !user.username) {
    return null;
  }
  if (!isSupabaseConfigured() || !supabase) return null;

  const cleanUser = user.username.replace(/^@/, '').toLowerCase();
  const { data: member } = await supabase
    .from('team_members')
    .select('telegram_id')
    .ilike('username', cleanUser)
    .not('telegram_id', 'like', '@%')
    .filter('telegram_id', 'not.ilike', '136116626126%')
    .limit(1)
    .maybeSingle();

  if (member?.telegram_id) {
    return { ...user, id: String(member.telegram_id) };
  }
  return null;
}
