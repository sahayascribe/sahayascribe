-- Booking notification emails.
--
-- How it works
-- * Changes to exam_requests add rows to public.notifications (an outbox), inside the
--   same transaction as the change, so an email is queued only if the change commits.
-- * queue_scheduled_notifications() adds the time-based emails (exam reminders and
--   rating prompts). It is safe to call repeatedly: each email has a dedupe key.
-- * The send-notifications Edge Function runs every minute (pg_cron, see DEPLOYMENT.md).
--   It calls queue_scheduled_notifications(), claims a batch with claim_notifications(),
--   sends each email through Resend and records the result with finish_notification().
-- * Emails that no longer make sense when their turn comes (the scribe withdrew before
--   the "accepted" email went out, the exam was cancelled, ...) are skipped, not sent.
-- * Only the service role can use the outbox. Signed-in users and visitors cannot read it.
--
-- Emails
--   request_created    student   their request is live
--   request_accepted   student   scribe name and phone
--                      scribe    student name, phone and centre
--   scribe_withdrew    student   their request is open again
--   request_cancelled  scribe    the student cancelled an exam they had accepted
--   exam_reminder      both      the day before the exam, from 08:00 India time
--   rate_prompt        student   after the exam ends, if they have not rated yet

create table public.notifications (
  id bigint generated always as identity primary key,
  kind text not null check (kind in (
    'request_created', 'request_accepted', 'scribe_withdrew',
    'request_cancelled', 'exam_reminder', 'rate_prompt'
  )),
  request_id uuid not null references public.exam_requests (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  -- The scribe the email is about, so it can be skipped if the request changed hands.
  scribe_id uuid references public.scribes (id) on delete set null,
  -- Set for scheduled emails so each is queued only once.
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  attempts smallint not null default 0,
  -- A claimed email is not picked up again until this time (also used for retry backoff).
  locked_until timestamptz,
  sent_at timestamptz,
  skipped_reason text,
  last_error text,
  resend_id text
);

create index notifications_pending_idx on public.notifications (id)
  where sent_at is null and skipped_reason is null;
create index notifications_request_idx on public.notifications (request_id);

alter table public.notifications enable row level security;
-- No policies: only the service role (through the functions below) uses this table.

-- ---------------------------------------------------------------------------
-- Event emails
-- ---------------------------------------------------------------------------

create function public.queue_request_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (kind, request_id, recipient_id)
    values ('request_created', new.id, new.student_id);
    return null;
  end if;

  if new.status = 'accepted' and new.scribe_id is not null
     and (old.status <> 'accepted' or old.scribe_id is distinct from new.scribe_id) then
    insert into public.notifications (kind, request_id, recipient_id, scribe_id) values
      ('request_accepted', new.id, new.student_id, new.scribe_id),
      ('request_accepted', new.id, new.scribe_id, new.scribe_id);
  elsif old.status = 'accepted' and new.status = 'open' then
    -- The scribe withdrew, or their account was deleted.
    insert into public.notifications (kind, request_id, recipient_id)
    values ('scribe_withdrew', new.id, new.student_id);
  elsif old.status = 'accepted' and new.status = 'cancelled' and old.scribe_id is not null then
    insert into public.notifications (kind, request_id, recipient_id, scribe_id)
    values ('request_cancelled', new.id, old.scribe_id, old.scribe_id);
  end if;
  return null;
end;
$$;

create trigger exam_requests_notify after insert or update on public.exam_requests
  for each row execute function public.queue_request_notifications();

-- ---------------------------------------------------------------------------
-- Scheduled emails
-- ---------------------------------------------------------------------------

-- p_now is only there so tests can pick the time.
create function public.queue_scheduled_notifications(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamp := p_now at time zone 'Asia/Kolkata';
  v_reminders integer;
  v_prompts integer;
begin
  -- Reminder to the student and the scribe on the day before the exam. The scribe is
  -- part of the key, so if a new scribe takes over both get a fresh reminder.
  insert into public.notifications (kind, request_id, recipient_id, scribe_id, dedupe_key)
  select 'exam_reminder', r.id, x.recipient, r.scribe_id,
         format('exam_reminder:%s:%s:%s', r.id, r.scribe_id, x.recipient)
  from public.exam_requests r
  cross join lateral (values (r.student_id), (r.scribe_id)) as x (recipient)
  where r.status = 'accepted'
    and r.scribe_id is not null
    and r.exam_date = v_now::date + 1
    and v_now::time >= time '08:00'
  on conflict (dedupe_key) do nothing;
  get diagnostics v_reminders = row_count;

  -- Rating prompt once the exam has ended. Exams that ended more than 3 days ago are
  -- left alone so turning this on does not email everyone about old exams.
  insert into public.notifications (kind, request_id, recipient_id, scribe_id, dedupe_key)
  select 'rate_prompt', r.id, r.student_id, r.scribe_id, format('rate_prompt:%s', r.id)
  from public.exam_requests r
  where r.status = 'accepted'
    and r.scribe_id is not null
    and r.exam_date + r.end_time <= v_now
    and r.exam_date >= v_now::date - 3
    and not exists (select 1 from public.ratings rt where rt.request_id = r.id)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_prompts = row_count;

  return v_reminders + v_prompts;
end;
$$;

-- ---------------------------------------------------------------------------
-- Sending (used by the send-notifications Edge Function)
-- ---------------------------------------------------------------------------

-- Skips emails that are out of date, then claims up to p_limit pending emails for
-- 5 minutes and returns everything needed to write them. Phone numbers are included
-- only in the emails that go to the matched student and scribe.
create function public.claim_notifications(p_limit integer default 20)
returns table (id bigint, kind text, email text, data jsonb)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  update public.notifications n
     set skipped_reason = case
           when n.attempts >= 5 then 'failed'
           when u.email is null then 'no_email'
           else 'out_of_date'
         end
    from public.exam_requests r, auth.users u
   where r.id = n.request_id
     and u.id = n.recipient_id
     and n.sent_at is null
     and n.skipped_reason is null
     and (n.locked_until is null or n.locked_until < now())
     and (
       n.attempts >= 5
       or u.email is null
       or (n.kind <> 'rate_prompt' and r.exam_date < public.today_ist())
       or (n.kind in ('request_created', 'scribe_withdrew') and r.status = 'cancelled')
       or (n.kind in ('request_accepted', 'exam_reminder')
           and (r.status <> 'accepted' or n.scribe_id is null or r.scribe_id is distinct from n.scribe_id))
       or (n.kind = 'rate_prompt'
           and (r.status <> 'accepted' or exists (select 1 from public.ratings rt where rt.request_id = r.id)))
     );

  return query
  with picked as (
    select p.id
    from public.notifications p
    where p.sent_at is null
      and p.skipped_reason is null
      and (p.locked_until is null or p.locked_until < now())
    order by p.id
    limit greatest(p_limit, 0)
    for update skip locked
  ),
  claimed as (
    update public.notifications n
       set attempts = n.attempts + 1,
           locked_until = now() + interval '5 minutes'
      from picked
     where n.id = picked.id
    returning n.id, n.kind, n.request_id, n.recipient_id, n.scribe_id
  )
  select c.id, c.kind, u.email::text,
         jsonb_build_object(
           'role', case when c.recipient_id = r.student_id then 'student' else 'scribe' end,
           'subject', r.subject,
           'exam_date', r.exam_date,
           'start_time', to_char(r.start_time, 'HH24:MI'),
           'end_time', to_char(r.end_time, 'HH24:MI'),
           'centre_name', r.centre_name,
           'centre_address', r.centre_address,
           'question_medium', r.question_medium,
           'recipient_name', case when c.recipient_id = r.student_id then st.full_name else sc.full_name end,
           'student_name', case when c.recipient_id = r.student_id then st.full_name
                                else split_part(btrim(st.full_name), ' ', 1) end
         )
         || case
              -- Student hears about their scribe.
              when c.recipient_id = r.student_id and c.kind in ('request_accepted', 'exam_reminder', 'rate_prompt') then
                jsonb_build_object(
                  'scribe_name', sc.full_name,
                  'scribe_mobile', case when c.kind <> 'rate_prompt' then sc.mobile end,
                  'scribe_qualification', sc.qualification,
                  'scribe_city', sc.city
                )
              -- Scribe hears about the student they are writing for.
              when c.recipient_id <> r.student_id and c.kind in ('request_accepted', 'exam_reminder') then
                jsonb_build_object(
                  'student_name', st.full_name,
                  'student_mobile', st.mobile,
                  'institution', st.institution,
                  'notes', r.notes
                )
              else '{}'::jsonb
            end
  from claimed c
  join public.exam_requests r on r.id = c.request_id
  join public.students st on st.id = r.student_id
  join auth.users u on u.id = c.recipient_id
  left join public.scribes sc on sc.id = c.scribe_id
  order by c.id;
end;
$$;

-- Records the outcome of one send. Failed sends are retried with growing gaps
-- (2, 4, 8, 16 minutes) and given up after 5 attempts.
create function public.finish_notification(p_id bigint, p_resend_id text default null, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set sent_at = case when p_error is null then now() end,
         resend_id = p_resend_id,
         last_error = left(p_error, 1000),
         locked_until = case when p_error is null then null
                             else now() + interval '1 minute' * power(2, attempts) end
   where id = p_id
     and sent_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

revoke all on public.notifications from anon, authenticated;
revoke execute on function
  public.queue_request_notifications(),
  public.queue_scheduled_notifications(timestamptz),
  public.claim_notifications(integer),
  public.finish_notification(bigint, text, text)
from public, anon, authenticated;
grant execute on function
  public.queue_scheduled_notifications(timestamptz),
  public.claim_notifications(integer),
  public.finish_notification(bigint, text, text)
to service_role;
