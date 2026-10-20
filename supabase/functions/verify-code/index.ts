import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyTelegramWebAppData(initData: string, botToken: string): Promise<any | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries: string[] = [];
    params.forEach((val, key) => entries.push(`${key}=${val}`));
    entries.sort();
    const dataCheckString = entries.join('\n');

    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const secretSig = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(botToken));

    const dataKey = await crypto.subtle.importKey(
      'raw',
      secretSig,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const computedSig = await crypto.subtle.sign('HMAC', dataKey, encoder.encode(dataCheckString));
    const computedHex = Array.from(new Uint8Array(computedSig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (computedHex.toLowerCase() !== hash.toLowerCase()) return null;

    const userJson = params.get('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch {
    return null;
  }
}

async function verifyTelegramWidgetData(authData: Record<string, any>, botToken: string): Promise<boolean> {
  try {
    const { hash, ...data } = authData;
    if (!hash) return false;

    const entries: string[] = [];
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && val !== null) {
        entries.push(`${key}=${val}`);
      }
    }
    entries.sort();
    const dataCheckString = entries.join('\n');

    const encoder = new TextEncoder();
    const secretHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      secretHash,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sig = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(dataCheckString));
    const computedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHex.toLowerCase() === String(hash).toLowerCase();
  } catch {
    return false;
  }
}

async function getOrCreateUserSession(
  supabaseAdmin: any,
  supabaseUrl: string,
  anonKey: string,
  botToken: string,
  telegramId: string | number,
  userData: { first_name?: string; username?: string; photo_url?: string }
) {
  const tgIdStr = String(telegramId);
  const email = `tg_${tgIdStr}@telegram.local`;

  // Генерируємо детермінований стійкий пароль для внутрішнього акаунту
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(botToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`tg_auth_secret_${tgIdStr}`));
  const password = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const userMetadata = {
    telegram_id: tgIdStr,
    first_name: userData.first_name || '',
    username: userData.username || '',
    photo_url: userData.photo_url || '',
  };

  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (createError) {
    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existing = usersList?.users?.find((u: any) => u.email === email);
    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password,
        user_metadata: userMetadata,
      });
    }
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const { data: sessionData, error: signInErr } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr || !sessionData?.session) {
    console.error('Failed to create session:', signInErr);
    return null;
  }

  return sessionData.session;
}

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

  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'anonymous';

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://dwzswscabsphwprptnos.supabase.co';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN') || '8785054597:AAGy7dsFj77PYwuXC71NULvRjNxca6EFA9I';

  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Криптографічна верифікація Telegram initData + генерація сесії
    if (body.initData) {
      const tgUser = await verifyTelegramWebAppData(body.initData, botToken);
      if (!tgUser) {
        return new Response(JSON.stringify({ error: 'Недійсний підпис Telegram WebApp' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const photoUrl = tgUser.photo_url || (tgUser.username ? `https://t.me/i/userpic/320/${tgUser.username}.jpg` : '');
      const userData = {
        id: String(tgUser.id),
        first_name: tgUser.first_name || '',
        username: tgUser.username || '',
        photo_url: photoUrl,
      };

      const session = await getOrCreateUserSession(
        supabase,
        supabaseUrl,
        anonKey,
        botToken,
        tgUser.id,
        userData
      );

      return new Response(
        JSON.stringify({
          ok: true,
          user: userData,
          session,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1.1. Верифікація Telegram Login Widget (вхід через Telegram у звичайному браузері)
    if (body.telegramAuth) {
      const authData = body.telegramAuth;
      const isValid = await verifyTelegramWidgetData(authData, botToken);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Недійсний підпис авторизації Telegram' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const photoUrl =
        authData.photo_url ||
        (authData.username ? `https://t.me/i/userpic/320/${authData.username}.jpg` : '');
      const userData = {
        id: String(authData.id),
        first_name: authData.first_name || '',
        username: authData.username || '',
        photo_url: photoUrl,
      };

      const session = await getOrCreateUserSession(
        supabase,
        supabaseUrl,
        anonKey,
        botToken,
        authData.id,
        userData
      );

      return new Response(
        JSON.stringify({
          ok: true,
          user: userData,
          session,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Персистентний захист від Brute-Force перебору (Rate Limiting)
    const { data: rateCheck } = await supabase.rpc('check_and_register_auth_attempt', {
      p_ip: clientIp,
    });

    if (rateCheck && rateCheck.allowed === false) {
      return new Response(
        JSON.stringify({
          error: `Забагато невдалих спроб. Зачекайте ${rateCheck.retry_after} сек.`,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateCheck.retry_after),
          },
        }
      );
    }

    const cleanCode = String(body.code || '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      return new Response(JSON.stringify({ error: 'Введіть 6-значний код' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    // Успішний вхід — очищуємо лічильник та спалюємо одноразовий код
    await supabase.rpc('clear_auth_rate_limit', { p_ip: clientIp });
    await supabase.from('auth_codes').delete().eq('id', data.id);

    const photoUrl = data.photo_url || (data.username ? `https://t.me/i/userpic/320/${data.username}.jpg` : '');
    const userData = {
      id: data.telegram_id,
      first_name: data.first_name,
      username: data.username,
      photo_url: photoUrl,
    };

    const session = await getOrCreateUserSession(
      supabase,
      supabaseUrl,
      anonKey,
      botToken,
      data.telegram_id,
      userData
    );

    return new Response(
      JSON.stringify({
        ok: true,
        user: userData,
        session,
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
