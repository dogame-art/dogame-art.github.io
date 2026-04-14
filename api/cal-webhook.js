export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const secret = process.env.CAL_WEBHOOK_SECRET;

  if (!token || !chatId) {
    console.error('[cal-webhook] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (secret) {
    const provided = req.headers['x-cal-signature-256'] || req.headers['x-webhook-secret'];
    if (provided !== secret) {
      console.warn('[cal-webhook] signature mismatch');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const { triggerEvent, payload } = req.body || {};

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
      `*Guest:* ${escape(name)}${handle ? ` (@${escape(handle.replace(/^@/, ''))})` : ''}`,
      email ? `*Email:* ${escape(email)}` : null,
      `*When:* ${escape(when)}`,
      `*Event:* ${escape(title)}`,
      focus ? `*Focus:* ${escape(focus)}` : null,
      topic ? `*Topic:* ${escape(topic)}` : null,
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
      return res.status(502).json({ error: 'Telegram delivery failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[cal-webhook] handler error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
}

function escape(s) {
  return String(s).replace(/([_*`\[\]])/g, '\\$1');
}
