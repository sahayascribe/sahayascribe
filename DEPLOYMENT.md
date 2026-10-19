# Deploying SahayaScribe

The app runs on your existing Render web service and keeps the current domain.
Data lives in Supabase.

## 1. Supabase project

1. Create a project at supabase.com (region: **Mumbai, ap-south-1**). Ideally create two:
   `sahayascribe-dev` for testing and `sahayascribe-prod` for real users.
2. **SQL Editor:** run the files in `supabase/migrations/` in order:
   - `20261018000001_core_schema.sql`
   - `20261018000002_document_storage.sql`
   - `20261019000001_notifications.sql`
3. **Authentication → Sign In / Providers → Email:** keep Email enabled. Signing in with a one-time code
   confirms the address automatically.
4. **Sign-in emails:** on the free plan with Supabase's built-in email sender, the email contains a
   **sign-in link**, which the app supports. Email templates can only be edited after connecting your own
   SMTP sender (step 6). Then, under **Authentication → Email Templates**, add the code to both the
   **Magic Link** and **Confirm signup** templates so people can type it instead of clicking:

   ```html
   <h2>Your SahayaScribe sign-in code</h2>
   <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
   <p>If you did not request this, you can ignore this email.</p>
   ```

5. **Authentication → URL Configuration:**
   - Site URL: `https://sahayascribe.com`
   - Redirect URLs: `https://sahayascribe.com/**`, `https://www.sahayascribe.com/**`, `http://localhost:5173/**`
   - Email OTP length: 6, expiry: 600 seconds
6. **Authentication → SMTP Settings:** Supabase's built-in email sender only sends a few emails per hour and is
   meant for testing (currently 2 per hour). Send sign-in emails through Resend instead:
   - In Resend, create an API key named `supabase-auth` with **Sending access** for `notification.sahayascribe.com` only.
   - In Supabase, turn on **Enable custom SMTP** and fill in:
     - Sender email: `no-reply@notification.sahayascribe.com`, sender name: `SahayaScribe`
     - Host: `smtp.resend.com`, port: `465`
     - Username: `resend`, password: the `supabase-auth` API key
   - Under **Authentication → Rate Limits**, raise **emails sent per hour** (for example to 100).
   - Sign in once to check that the email arrives from `no-reply@notification.sahayascribe.com`.
7. **Project Settings → API:** copy the **Project URL** and the **anon / publishable key**.

## 2. Render

In your existing web service:

- **Build command:** `npm ci --include=dev && npm run build`
- **Start command:** `npm start`
- **Environment variables:**
  - `HOST` = `0.0.0.0`
  - `VITE_SUPABASE_URL` = your Project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon / publishable key

The `VITE_` values are built into the site, so redeploy after changing them.
The old `ADMIN_PASSWORD` and `DATA_DIR` variables and the persistent disk are no longer used.

Your custom domain stays attached to the same service, so no DNS changes are needed.

## 3. Booking emails (Resend)

Booking changes queue emails in the database (`20261019000001_notifications.sql`). The
`send-notifications` Edge Function sends them through Resend, and pg_cron runs it every minute.

1. **Resend:** the `notification.sahayascribe.com` domain must show **Verified**. Create a second API key named
   `booking-emails` with **Sending access** for that domain.
2. **Edge Function secrets** (Supabase → Edge Functions → Secrets):
   - `RESEND_API_KEY`: the `booking-emails` key
   - `EMAIL_FROM`: `SahayaScribe <notifications@notification.sahayascribe.com>`
   - `NOTIFY_SECRET`: a long random string (for example the output of `openssl rand -hex 32`)
   - Optional: `EMAIL_REPLY_TO` (an inbox people can reply to) and `APP_URL` (defaults to `https://sahayascribe.com`)
3. **Deploy the function** with the Supabase CLI, with JWT verification off (the function checks
   `NOTIFY_SECRET` itself):

   ```bash
   npx supabase functions deploy send-notifications --no-verify-jwt --project-ref <your-project-ref>
   ```

4. **Schedule it:** under **Integrations**, enable **Cron** (`pg_cron`) and **pg_net**, then run this in the
   SQL Editor with your project ref and the same `NOTIFY_SECRET`:

   ```sql
   select vault.create_secret('https://<your-project-ref>.supabase.co/functions/v1/send-notifications', 'notify_url');
   select vault.create_secret('<NOTIFY_SECRET>', 'notify_secret');

   select cron.schedule('send-notifications', '* * * * *', $$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_url'),
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret')
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 30000
     );
   $$);
   ```

5. **Check:** book a test exam, then within a minute look at **Resend → Emails**, or run
   `select kind, sent_at, skipped_reason, last_error from public.notifications order by id desc limit 20;`.

Failed sends are retried up to 5 times. Resend's free plan allows 100 emails a day and 3,000 a month.

## 4. Check after deploying

- `https://sahayascribe.com` loads, and signing in with an email code works.
- `https://sahayascribe.com/admin.html` lets only the admin emails in.
- Booking an exam sends a "request is live" email.

## Never share

- the `service_role` / secret key
- the Resend API keys and `NOTIFY_SECRET`
- the database password
- personal access tokens

These are never needed by the website.
