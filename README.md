# SahayaScribe

Website for connecting visually impaired students with volunteer exam scribes.

- **Frontend:** React + Vite (`src/`), with the public site at `/` and a private admin dashboard at `/admin.html`.
- **Backend:** Supabase: email one-time-code login, Postgres with Row Level Security, and private document storage.
- **Email:** Resend, for sign-in emails (as Supabase's SMTP sender) and booking emails (`supabase/functions/send-notifications`).
- **Hosting:** Render web service (`server.js` serves the built app with security headers).

See [FEATURES.md](FEATURES.md) for what the app does and [DEPLOYMENT.md](DEPLOYMENT.md) for setup.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev                  # http://localhost:5173
```

## Database

Migrations live in `supabase/migrations/`. Apply them in order to your Supabase project
(SQL Editor, or `supabase db push` with the Supabase CLI).

```bash
npm run test:db   # runs the migrations + RLS tests against a throwaway local Postgres
```

The tests in `supabase/tests/rls_test.sql` check that signed-out visitors see nothing, users
only see their own data, scribes only see requests they are eligible for, phone numbers are
shared only after a match, and only confirmed admin emails get admin access.

## Security model (summary)

| Data | Who can read | Who can change |
|---|---|---|
| Student / scribe profile | the owner, admins | the owner |
| Exam request | the student who created it, the scribe who accepted it, admins | student creates; accept / withdraw / cancel / rate only through database functions that re-check the rules |
| Open requests for scribes | eligible scribes, through `eligible_requests()` (no phone numbers) | — |
| Phone numbers | the matched student and scribe after acceptance, admins | — |
| Documents (certificates, IDs) | the uploader, admins (private bucket) | the uploader, own folder only |
| Admin list | nobody through the API | database owner only |

Admins are the emails in `public.admins`. To add one, run in the Supabase SQL Editor:
`insert into public.admins (email) values ('person@example.com');`
