export const config = { runtime: 'edge' };

async function verifySignature(secret, rawBody, provided) {
  if (!provided) return false;
  const clean = String(provided).replace(/^sha256=/i, '').trim();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (expected.length !== clean.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ clean.charCodeAt(i);
  return diff === 0;
}

function escapeMd(s) {
  return String(s).replace(/([_*`\[\]])/g, '\\$1');
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const secret = process.env.CAL_WEBHOOK_SECRET;

  if (!token || !chatId) {
    console.error('[cal-webhook] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return json({ error: 'Server misconfigured' }, 500);
  }

  const rawBody = await request.text();

  if (secret) {
    const provided = request.headers.get('x-cal-signature-256')
      || request.headers.get('x-webhook-signature')
      || request.headers.get('x-hub-signature-256');
    const ok = await verifySignature(secret, rawBody, provided);
    if (!ok) {
      console.warn('[cal-webhook] signature mismatch');
      return json({ error: 'Unauthorized' }, 401);
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody || '{}');
  } catch (err) {
    console.error('[cal-webhook] json parse failed', err.message);
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    const { triggerEvent, payload } = body;

    const title = payload?.title || 'Drawn to the Mic Interview';
    const startTime = payload?.startTime ? new Date(payload.startTime) : null;
    const attendee = payload?.attendees?.[0] || {};
    const name = attendee.name || 'Unknown';
    const email = attendee.email || '';
    const responses = payload?.responses || {};

    const handle = responses.handle?.value || responses['x-twitter-handle']?.value || responses.twitter?.value || '';
    const topic = responses.topic?.value || responses['anything-specific-you-want-to-talk-about']?.value || '';
    const focus = responses.focus?.value || responses['art-music-focus']?.value || '';

    const when = startTime
      ? startTime.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'full', timeStyle: 'short' }) + ' PT'
      : 'Unknown time';

    const eventLabel = triggerEvent === 'BOOKING_CREATED' ? '🎙️ New DTTM Booking'
      : triggerEvent === 'BOOKING_RESCHEDULED' ? '🔄 DTTM Rescheduled'
      : triggerEvent === 'BOOKING_CANCELLED' ? '❌ DTTM Cancelled'
      : `📅 DTTM Event: ${triggerEvent}`;

    const lines = [
      `*${eventLabel}*`,
      '',
      `*Guest:* ${escapeMd(name)}${handle ? ` (@${escapeMd(String(handle).replace(/^@/, ''))})` : ''}`,
      email ? `*Email:* ${escapeMd(email)}` : null,
      `*When:* ${escapeMd(when)}`,
      `*Event:* ${escapeMd(title)}`,
      focus ? `*Focus:* ${escapeMd(focus)}` : null,
      topic ? `*Topic:* ${escapeMd(topic)}` : null,
    ].filter(Boolean);

    const text = lines.join('\n');

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error('[cal-webhook] telegram error', err);
      return json({ error: 'Telegram delivery failed' }, 502);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('[cal-webhook] handler error', err.message);
    return json({ error: 'Internal error' }, 500);
  }
}
