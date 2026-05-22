# Design: Booking Notification Emails

**Date:** 2026-05-22  
**Status:** Approved

## Summary

When a new booking is created, all registered users receive an email notification via a Supabase Edge Function triggered by a database webhook. Emails are sent through Resend as a single BCC batch.

The existing EmailJS browser-side confirmation (sent only to the booker) is removed to avoid double-emailing.

---

## Architecture

```
User submits booking
        ↓
BookingModal.jsx → addBooking() → Supabase inserts row into bookings table
        ↓
Supabase Database Webhook (INSERT on bookings)
        ↓
Supabase Edge Function: notify-booking
        ↓
  1. Validates webhook secret
  2. Fetches all emails from profiles table (service role key)
  3. Sends one Resend API call: BCC = all profile emails
        ↓
All registered users receive the notification email
```

---

## Edge Function

**File:** `supabase/functions/notify-booking/index.ts`

**Trigger:** Supabase Database Webhook on `INSERT` into the `bookings` table.  
Supabase posts the new row as JSON to the function URL with a secret header for verification.

**Steps:**
1. Verify the `x-webhook-secret` header matches `WEBHOOK_SECRET` env var — return 401 if not.
2. Extract booking fields from `payload.record`: `equipment_name`, `date`, `start_time`, `end_time`, `user_name`, `purpose`.
3. Query the `profiles` table with the service-role key and collect all `email` values.
4. Send one email via Resend:
   - `to`: `RESEND_FROM_EMAIL` (the from address, avoids empty To field)
   - `bcc`: all collected profile emails
   - `subject`: `New Booking: {equipment_name} on {date}`
   - `html`: HTML card with booking details (see Email Content below)

**Error handling:** Log errors and return HTTP 500. A failed send does not roll back the booking — the booking is already committed to the DB.

---

## Email Content

**Subject:** `New Booking: [Equipment Name] on [Date]`

**HTML body (card layout):**
```
New Equipment Booking

[Equipment Name] has been booked.

  Booked by:  [User Name]
  Date:       Monday, May 25, 2026
  Time:       09:00 – 10:00
  Purpose:    [Purpose or "—"]

This is an automated notification from the Lab Equipment Booking System.
```

---

## Configuration

### Supabase Edge Function secrets (set in Supabase dashboard → Edge Functions → Secrets)

| Secret | Description |
|--------|-------------|
| `RESEND_API_KEY` | API key from resend.com |
| `RESEND_FROM_EMAIL` | Verified sender address (e.g. `noreply@lab.example.com`) |
| `SUPABASE_URL` | Automatically available in all Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Automatically available in all Edge Functions |
| `WEBHOOK_SECRET` | Random string set when creating the webhook in Supabase dashboard |

### Supabase Database Webhook (set in Supabase dashboard → Database → Webhooks)

- **Table:** `bookings`
- **Event:** `INSERT`
- **URL:** `{SUPABASE_URL}/functions/v1/notify-booking`
- **HTTP headers:** `x-webhook-secret: {WEBHOOK_SECRET}`

---

## Frontend Changes

- **Remove** the `emailjs.send(...)` block in `src/components/BookingModal.jsx` (lines 44–53)
- **Remove** `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY` from `.env` and `.env.example`
- **Uninstall** the `@emailjs/browser` package

---

## Out of Scope

- Unsubscribe / opt-out mechanism (can be added later if needed)
- Email notifications for booking cancellations or updates
- Per-equipment subscription (all users get all notifications)

---

## Setup Steps (for the implementer)

1. Create a free [Resend](https://resend.com) account and generate an API key.
2. Verify a sender domain (or use Resend's shared `onboarding@resend.dev` for testing).
3. Install Supabase CLI and run `supabase functions new notify-booking`.
4. Write the Edge Function (see above spec).
5. Deploy: `supabase functions deploy notify-booking`.
6. In Supabase dashboard, create a Database Webhook pointing at the deployed function.
7. Set the four secrets in the Edge Function settings.
8. Remove the EmailJS code from `BookingModal.jsx`.
9. Test by creating a booking and checking all inboxes.
