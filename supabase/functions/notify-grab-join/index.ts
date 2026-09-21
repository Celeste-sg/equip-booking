import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Triggered by a Database Webhook (INSERT on public.grab_participants).
// Emails the event organizer when someone else joins their Grab event.

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret && req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: { type: string; record?: Record<string, unknown> }
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 })
  }
  if (payload.type !== 'INSERT' || !payload.record) return json({ ok: true, skipped: true })

  const { event_id, user_id, quantity, note } = payload.record as {
    event_id: string; user_id: string; quantity: number | null; note: string | null
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: event, error: eventErr } = await supabase
    .from('grab_events')
    .select('id, type, store_name, deadline, creator_id')
    .eq('id', event_id)
    .single()
  if (eventErr || !event) {
    console.error('Event lookup failed:', eventErr?.message)
    return json({ ok: false, error: 'event not found' }, 500)
  }

  // The starter of a group order joins their own event automatically: no email.
  if (event.creator_id === user_id) return json({ ok: true, skipped: 'creator joined own event' })

  const [{ data: joiner }, { data: creator, error: creatorErr }, { count }] = await Promise.all([
    supabase.from('profiles').select('name, email').eq('id', user_id).single(),
    supabase.auth.admin.getUserById(event.creator_id),
    supabase.from('grab_participants').select('id', { count: 'exact', head: true }).eq('event_id', event_id),
  ])
  const to = creator?.user?.email
  if (creatorErr || !to) {
    console.error('Creator email lookup failed:', creatorErr?.message)
    return json({ ok: false, error: 'organizer email not found' }, 500)
  }

  const joinerName = joiner?.name || joiner?.email?.split('@')[0] || '有人'
  const isPickup = event.type === 'pickup'
  const emoji = isPickup ? '☕' : '🧋'
  const siteUrl = (Deno.env.get('SITE_URL') || 'https://celeste-sg.github.io/equip-booking').replace(/\/$/, '')
  const eventUrl = `${siteUrl}/#/grab/event/${event.id}`
  const deadline = new Date(event.deadline).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:14px;width:90px;">${label}</td>
      <td style="padding:6px 0;font-size:14px;">${value}</td>
    </tr>`

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#d97706;margin-bottom:4px;">${emoji} ${esc(joinerName)} 加入了你的活动</h2>
      <p style="color:#6b7280;margin-top:0;">${esc(event.store_name)}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-top:16px;">
        <table style="width:100%;border-collapse:collapse;">
          ${row('参加者', esc(joinerName))}
          ${quantity ? row('杯数', String(esc(quantity))) : ''}
          ${note ? row('备注', esc(note)) : ''}
          ${row('目前人数', `${count ?? '?'} 人`)}
          ${row('报名截止', esc(deadline))}
        </table>
      </div>
      <p style="margin-top:20px;">
        <a href="${esc(eventUrl)}" style="background:#f59e0b;color:#fff;text-decoration:none;padding:10px 20px;border-radius:12px;display:inline-block;">查看活动</a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">这是 Grab 自动发送的通知。</p>
    </div>
  `

  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL')!
  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail },
      subject: `${emoji} ${joinerName} 加入了「${event.store_name}」`,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!sgRes.ok) {
    console.error(`SendGrid error (${sgRes.status}):`, await sgRes.text())
    return json({ ok: false, error: 'Email send failed', providerStatus: sgRes.status }, 500)
  }
  return json({ ok: true })
})
