import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://dwzswscabsphwprptnos.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

  try {
    const { code } = await req.json();
    const cleanCode = String(code || '').trim();

    if (!cleanCode || cleanCode.length !== 6) {
      return new Response(JSON.stringify({ error: 'Введіть 6-значний код' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Burn on use: single-use code
    await supabase.from('auth_codes').delete().eq('id', data.id);

    const photoUrl = data.photo_url || (data.username ? `https://t.me/i/userpic/320/${data.username}.jpg` : '');

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: data.telegram_id,
          first_name: data.first_name,
          username: data.username,
          photo_url: photoUrl,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
