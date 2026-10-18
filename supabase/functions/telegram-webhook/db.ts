import { createClient } from 'jsr:@supabase/supabase-js@2';

export function getSupabaseClient() {
  const url = Deno.env.get('SUPABASE_URL') || 'https://dwzswscabsphwprptnos.supabase.co';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(url, key);
}
