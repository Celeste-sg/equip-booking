import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  if (webhookSecret && req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: { type: string; record: Record<string, string> }
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad Request: invalid JSON', { status: 400 })
  }

  if (!payload.record) {
    return new Response('Bad Request: missing record', { status: 400 })
  }

  const { equipment_name, user_name, date, start_time, end_time, purpose } = payload.record

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Failed to fetch users:', error.message)
    return new Response('Internal Server Error', { status: 500 })
  }

  const emails = users.map((u: { email?: string }) => u.email).filter(Boolean) as string[]
  if (emails.length === 0) {
    return new Response(JSON.stringify({ ok: true, recipients: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL')!
  const subject = `New Booking: ${equipment_name} on ${date}`
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e40af;margin-bottom:4px;">New Equipment Booking</h2>
      <p style="color:#6b7280;margin-top:0;">A new booking has been made.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-top:16px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">Equipment</td>
            <td style="padding:6px 0;font-weight:600;font-size:14px;">${equipment_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Booked by</td>
            <td style="padding:6px 0;font-size:14px;">${user_name}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Date</td>
            <td style="padding:6px 0;font-size:14px;">${date}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Time</td>
            <td style="padding:6px 0;font-size:14px;">${start_time} – ${end_time}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:14px;">Purpose</td>
            <td style="padding:6px 0;font-size:14px;">${purpose || '—'}</td>
          </tr>
        </table>
      </div>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
        This is an automated notification from the Lab Equipment Booking System.
      </p>
    </div>
  `

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: fromEmail }],
        bcc: emails.filter((e) => e !== fromEmail).map((e) => ({ email: e })),
      }],
      from: { email: fromEmail },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!sgRes.ok) {
    const err = await sgRes.text()
    console.error('SendGrid error:', err)
    return new Response('Email send failed', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, recipients: emails.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
