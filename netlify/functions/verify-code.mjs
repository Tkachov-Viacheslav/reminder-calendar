import { createClient } from '@supabase/supabase-js';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { code } = await req.json();
    const cleanCode = String(code || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return new Response(JSON.stringify({ error: 'Введіть 6-значний код' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('auth_codes')
      .select('*')
      .eq('code', cleanCode)
      .gt('expires_at', now)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Недійсний або прострочений код' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Single-use code cleanup
    await supabase.from('auth_codes').delete().eq('id', data.id);

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: data.telegram_id,
          first_name: data.first_name,
          username: data.username,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
