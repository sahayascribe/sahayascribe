// Sends queued booking emails through Resend. Called every minute by pg_cron
// (see DEPLOYMENT.md). Deploy with JWT verification off; requests must carry
// "Authorization: Bearer <NOTIFY_SECRET>".
//
// Secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   Resend API key with sending access
//   EMAIL_FROM       e.g. "SahayaScribe <notifications@notification.sahayascribe.com>" (a verified Resend domain)
//   NOTIFY_SECRET    long random string, also stored in Vault for the cron job
//   APP_URL          optional, defaults to https://sahayascribe.com
//   EMAIL_REPLY_TO   optional reply-to address
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { renderEmail, type NotificationData } from './emails.ts';

const BATCH_SIZE = 20;
// Resend allows 2 requests per second by default.
const SEND_GAP_MS = 600;

type Claimed = { id: number; kind: string; email: string; data: NotificationData };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

async function sendWithResend(n: Claimed, apiKey: string, from: string, replyTo: string | undefined, appUrl: string) {
  const email = renderEmail(n.kind, n.data, appUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Resend ignores a repeat of the same key, so a retry never sends twice.
      'Idempotency-Key': `notification-${n.id}`
    },
    body: JSON.stringify({
      from,
      to: [n.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags: [{ name: 'kind', value: n.kind }]
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${body?.message ?? response.statusText}`);
  return body?.id as string | undefined;
}

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let secret: string;
  try {
    secret = requireEnv('NOTIFY_SECRET');
  } catch (error) {
    return json({ error: String(error) }, 500);
  }
  if (request.headers.get('Authorization') !== `Bearer ${secret}`) return json({ error: 'Unauthorized' }, 401);

  try {
    const apiKey = requireEnv('RESEND_API_KEY');
    const from = requireEnv('EMAIL_FROM');
    const replyTo = Deno.env.get('EMAIL_REPLY_TO') || undefined;
    const appUrl = Deno.env.get('APP_URL') || 'https://sahayascribe.com';
    const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const scheduled = await supabase.rpc('queue_scheduled_notifications');
    if (scheduled.error) throw scheduled.error;

    const claimed = await supabase.rpc('claim_notifications', { p_limit: BATCH_SIZE });
    if (claimed.error) throw claimed.error;

    let sent = 0;
    let failed = 0;
    for (const [index, n] of ((claimed.data ?? []) as Claimed[]).entries()) {
      if (index > 0) await sleep(SEND_GAP_MS);
      let resendId: string | undefined;
      let failure: string | null = null;
      try {
        resendId = await sendWithResend(n, apiKey, from, replyTo, appUrl);
        sent += 1;
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error);
        failed += 1;
        console.error(`notification ${n.id} (${n.kind}) failed: ${failure}`);
      }
      const finished = await supabase.rpc('finish_notification', {
        p_id: n.id,
        p_resend_id: resendId ?? null,
        p_error: failure
      });
      if (finished.error) console.error(`could not record notification ${n.id}: ${finished.error.message}`);
    }

    return json({ queued: scheduled.data, sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : (error as { message?: string })?.message ?? String(error);
    console.error(message);
    return json({ error: message }, 500);
  }
});
