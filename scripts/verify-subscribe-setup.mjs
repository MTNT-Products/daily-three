/**
 * Verifies Supabase subscribe RPC + optional Resend key (no secrets printed).
 * Usage: node scripts/verify-subscribe-setup.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env');

function loadEnv() {
  const out = {};
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      out[t.slice(0, i)] = t.slice(i + 1);
    }
  } catch {
    /* no .env */
  }
  return out;
}

// .env wins over empty shell env (e.g. RESEND_API_KEY= from an old session)
const fromFile = loadEnv();
const env = { ...process.env, ...fromFile };
for (const [k, v] of Object.entries(fromFile)) {
  if (v != null && String(v).trim() !== '') env[k] = v;
}
const url = env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const anon = env.PUBLIC_SUPABASE_ANON_KEY;
const resend = env.RESEND_API_KEY?.trim();
const emailTo = env.EMAIL_TO?.trim();

console.log('PUBLIC_SUPABASE_URL:', url ? 'SET' : 'MISSING');
console.log('PUBLIC_SUPABASE_ANON_KEY:', anon ? 'SET' : 'MISSING');
console.log('RESEND_API_KEY:', resend ? `SET(len=${resend.length})` : 'EMPTY');
console.log('EMAIL_TO:', emailTo ? `SET(len=${emailTo.length})` : 'EMPTY');

if (!url || !anon) {
  process.exit(1);
}

const sb = createClient(url, anon);
const probe = `verify-${Date.now()}@example.invalid`;
const { data, error } = await sb.rpc('subscribe_to_digest', {
  p_email: probe,
  p_locale: 'ja',
});

if (error) {
  console.error('subscribe_to_digest RPC: FAIL', error.message);
  process.exit(1);
}

if (data?.ok) {
  console.log('subscribe_to_digest RPC: OK');
} else {
  console.error('subscribe_to_digest RPC: unexpected', data);
  process.exit(1);
}

if (resend?.startsWith('re_')) {
  // GET /domains は有効なキーでも 401 になることがあるため、送信 API で検証する
  const { Resend } = await import('resend');
  const client = new Resend(resend);
  const to = emailTo || 'delivered@resend.dev';
  const { error } = await client.emails.send({
    from: 'Daily Three <onboarding@resend.dev>',
    to,
    subject: 'Daily Three — API key verify',
    html: '<p>Setup verification (safe to delete).</p>',
  });
  if (error) {
    console.log(`Resend send test: FAIL (${error.name}) ${error.message}`);
    process.exit(1);
  }
  console.log('Resend send test: OK');
} else {
  console.log('Resend API: skipped (no local key)');
}
