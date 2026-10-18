# Deploying SahayaScribe

The app runs on your existing Render web service and keeps the current domain.
Data lives in Supabase.

## 1. Supabase project

1. Create a project at supabase.com (region: **Mumbai, ap-south-1**). Ideally create two:
   `sahayascribe-dev` for testing and `sahayascribe-prod` for real users.
2. **SQL Editor:** run the files in `supabase/migrations/` in order:
   - `20261018000001_core_schema.sql`
   - `20261018000002_document_storage.sql`
3. **Authentication → Sign In / Providers → Email:** keep Email enabled. Signing in with a one-time code
   confirms the address automatically.
4. **Authentication → Email Templates → Magic Link:** make the email show the code, for example:

   ```html
   <h2>Your SahayaScribe sign-in code</h2>
   <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
   <p>If you did not request this, you can ignore this email.</p>
   ```

5. **Authentication → URL Configuration:**
   - Site URL: `https://sahayascribe.com`
   - Redirect URLs: `https://sahayascribe.com/**`, `https://www.sahayascribe.com/**`, `http://localhost:5173/**`
6. **Authentication → SMTP Settings:** Supabase's built-in email sender only sends a few emails per hour and is
   meant for testing. Before going live, connect your own SMTP provider (for example Resend, Brevo, Amazon SES or
   Google Workspace) using an address like `no-reply@sahayascribe.com`.
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

## 3. Check after deploying

- `https://sahayascribe.com` loads, and signing in with an email code works.
- `https://sahayascribe.com/admin.html` lets only the admin emails in.

## Never share

- the `service_role` / secret key
- the database password
- personal access tokens

These are never needed by the website.
