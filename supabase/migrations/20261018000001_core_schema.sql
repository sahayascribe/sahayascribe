-- SahayaScribe core schema with Row Level Security.
--
-- Security model
-- * Every table has RLS on. anon (signed-out visitors) has no access to any table.
-- * A user owns exactly one profile: a row in students OR scribes keyed by auth.uid().
-- * Students create exam requests. They are never updated directly by clients:
--   accepting, withdrawing, cancelling and rating go through SECURITY DEFINER
--   functions that re-check ownership and eligibility inside the database.
-- * Scribes never read students or exam_requests directly. They browse through
--   eligible_requests(), which returns only open requests they qualify for and
--   never includes phone numbers.
-- * Phone numbers are shared only between the student and scribe of an accepted
--   request (student_requests() / scribe_assignments()), and with admins.
-- * Admins are listed by email in public.admins and can read everything.

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

create table public.admins (
  email text primary key check (email = lower(btrim(email)))
);

insert into public.admins (email) values
  ('rishabh@sahayascribe.com'),
  ('fhemanshu@gmail.com');

alter table public.admins enable row level security;
-- No policies: the admin list is not readable or writable through the API.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = a.email
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

-- India time is the reference for "today" (exam dates are local dates).
create function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.students (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  mobile text not null unique check (mobile ~ '^[6-9][0-9]{9}$'),
  institution text not null check (char_length(btrim(institution)) between 2 and 160),
  semester_year text not null check (char_length(btrim(semester_year)) between 1 and 40),
  medium text not null check (medium in ('English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Other')),
  certificate_path text check (certificate_path is null or certificate_path like id::text || '/%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scribes (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  mobile text not null unique check (mobile ~ '^[6-9][0-9]{9}$'),
  age smallint not null check (age between 16 and 100),
  city text not null check (char_length(btrim(city)) between 2 and 80),
  occupation text not null check (occupation in ('School Student', 'College Student', 'Working Professional')),
  -- 1 = 10th pass, 2 = 12th pass, 3 = Graduate, 4 = Postgraduate
  qualification_level smallint not null check (qualification_level between 1 and 4),
  qualification text not null check (char_length(btrim(qualification)) between 1 and 120),
  background text not null check (background in ('Science', 'Commerce', 'Arts', 'Other')),
  writing_mediums text[] not null check (
    cardinality(writing_mediums) between 1 and 5
    and writing_mediums <@ array['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu']
  ),
  id_document_path text not null check (id_document_path like id::text || '/%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One account is either a student or a scribe, never both.
create function public.enforce_single_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'students' and exists (select 1 from public.scribes where id = new.id) then
    raise exception 'This account is already registered as a scribe.' using errcode = 'P0001';
  end if;
  if tg_table_name = 'scribes' and exists (select 1 from public.students where id = new.id) then
    raise exception 'This account is already registered as a student.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger students_single_profile before insert on public.students
  for each row execute function public.enforce_single_profile();
create trigger scribes_single_profile before insert on public.scribes
  for each row execute function public.enforce_single_profile();
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();
create trigger scribes_touch before update on public.scribes
  for each row execute function public.touch_updated_at();

alter table public.students enable row level security;
alter table public.scribes enable row level security;

create policy "students: owner or admin can read" on public.students
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "students: owner can create own profile" on public.students
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "students: owner can update own profile" on public.students
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "scribes: owner or admin can read" on public.scribes
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "scribes: owner can create own profile" on public.scribes
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "scribes: owner can update own profile" on public.scribes
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Exam requests
-- ---------------------------------------------------------------------------

create table public.exam_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid() references public.students (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'accepted', 'cancelled')),
  exam_date date not null,
  start_time time not null,
  end_time time not null,
  centre_name text not null check (char_length(btrim(centre_name)) between 2 and 160),
  centre_address text not null check (char_length(btrim(centre_address)) between 5 and 300),
  subject text not null check (char_length(btrim(subject)) between 2 and 120),
  question_medium text not null check (question_medium in ('English', 'Kannada', 'Hindi', 'Tamil', 'Telugu')),
  -- 1 = 10th pass, 2 = 12th pass, 3 = Graduate
  min_qualification_level smallint not null check (min_qualification_level between 1 and 3),
  blocked_backgrounds text[] not null default '{}' check (blocked_backgrounds <@ array['Science', 'Commerce', 'Arts']),
  notes text check (notes is null or char_length(notes) <= 1000),
  scribe_id uuid references public.scribes (id) on delete set null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index exam_requests_student_idx on public.exam_requests (student_id);
create index exam_requests_scribe_idx on public.exam_requests (scribe_id);
create index exam_requests_open_idx on public.exam_requests (exam_date) where status = 'open';

-- Clients can only create fresh, open, unassigned requests for future dates.
create function public.prepare_exam_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'open';
  new.scribe_id := null;
  new.accepted_at := null;
  new.cancelled_at := null;
  new.created_at := now();
  if new.exam_date < public.today_ist() then
    raise exception 'The exam date cannot be in the past.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger exam_requests_prepare before insert on public.exam_requests
  for each row execute function public.prepare_exam_request();

-- If a scribe account is deleted, its accepted exams reopen for other scribes.
create function public.reopen_orphaned_request()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and new.scribe_id is null then
    new.status := 'open';
    new.accepted_at := null;
  end if;
  return new;
end;
$$;

create trigger exam_requests_reopen before update on public.exam_requests
  for each row execute function public.reopen_orphaned_request();

alter table public.exam_requests enable row level security;

create policy "exam_requests: student, assigned scribe or admin can read" on public.exam_requests
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or scribe_id = (select auth.uid())
    or (select public.is_admin())
  );
create policy "exam_requests: student can create own" on public.exam_requests
  for insert to authenticated
  with check (student_id = (select auth.uid()));
-- No update/delete policies: changes go through the functions below.

-- ---------------------------------------------------------------------------
-- Ratings
-- ---------------------------------------------------------------------------

create table public.ratings (
  request_id uuid primary key references public.exam_requests (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  scribe_id uuid not null references public.scribes (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  feedback text check (feedback is null or char_length(feedback) <= 1000),
  created_at timestamptz not null default now()
);

create index ratings_scribe_idx on public.ratings (scribe_id);

alter table public.ratings enable row level security;

create policy "ratings: rater, rated scribe or admin can read" on public.ratings
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or scribe_id = (select auth.uid())
    or (select public.is_admin())
  );
-- No insert policy: ratings go through rate_scribe().

-- ---------------------------------------------------------------------------
-- Eligibility and request workflow
-- ---------------------------------------------------------------------------

create function public.scribe_is_eligible(r public.exam_requests, s public.scribes)
returns boolean
language sql
stable
set search_path = ''
as $$
  select r.status = 'open'
    and r.exam_date >= public.today_ist()
    and r.student_id <> s.id
    and not (s.background = any (r.blocked_backgrounds))
    and r.question_medium = any (s.writing_mediums)
    and s.qualification_level >= r.min_qualification_level
    -- the scribe is not already writing another exam at an overlapping time
    and not exists (
      select 1
      from public.exam_requests other
      where other.scribe_id = s.id
        and other.status = 'accepted'
        and other.id <> r.id
        and other.exam_date = r.exam_date
        and other.start_time < r.end_time
        and r.start_time < other.end_time
    );
$$;

-- Open requests the signed-in scribe may accept. No phone numbers.
create function public.eligible_requests()
returns table (
  id uuid,
  subject text,
  exam_date date,
  start_time time,
  end_time time,
  centre_name text,
  centre_address text,
  question_medium text,
  min_qualification_level smallint,
  blocked_backgrounds text[],
  notes text,
  student_name text,
  institution text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.subject, r.exam_date, r.start_time, r.end_time, r.centre_name,
         r.centre_address, r.question_medium, r.min_qualification_level,
         r.blocked_backgrounds, r.notes,
         split_part(btrim(st.full_name), ' ', 1),
         st.institution
  from public.scribes s
  join public.exam_requests r on public.scribe_is_eligible(r, s)
  join public.students st on st.id = r.student_id
  where s.id = auth.uid()
  order by r.exam_date, r.start_time;
$$;

create function public.accept_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scribe public.scribes;
  v_request public.exam_requests;
begin
  select * into v_scribe from public.scribes where id = auth.uid();
  if not found then
    raise exception 'Please register as a scribe before accepting a request.' using errcode = '42501';
  end if;

  -- Lock the row so two scribes cannot accept the same request.
  select * into v_request from public.exam_requests where id = p_request_id for update;
  if not found or not public.scribe_is_eligible(v_request, v_scribe) then
    raise exception 'This exam is no longer available for your profile.' using errcode = 'P0001';
  end if;

  update public.exam_requests
     set status = 'accepted', scribe_id = v_scribe.id, accepted_at = now()
   where id = p_request_id;
end;
$$;

-- Assigned scribe steps back before the exam; the request reopens for others.
create function public.withdraw_from_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.exam_requests
     set status = 'open', scribe_id = null, accepted_at = null
   where id = p_request_id
     and scribe_id = auth.uid()
     and status = 'accepted'
     and exam_date >= public.today_ist();
  if not found then
    raise exception 'You can only withdraw from your own upcoming exams.' using errcode = 'P0001';
  end if;
end;
$$;

create function public.cancel_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.exam_requests
     set status = 'cancelled', cancelled_at = now()
   where id = p_request_id
     and student_id = auth.uid()
     and status in ('open', 'accepted')
     and exam_date >= public.today_ist();
  if not found then
    raise exception 'You can only cancel your own upcoming requests.' using errcode = 'P0001';
  end if;
end;
$$;

create function public.rate_scribe(p_request_id uuid, p_stars smallint, p_feedback text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.exam_requests;
begin
  select * into v_request
  from public.exam_requests
  where id = p_request_id
    and student_id = auth.uid()
    and status = 'accepted'
    and scribe_id is not null
    and exam_date <= public.today_ist();
  if not found then
    raise exception 'You can rate a scribe only after your exam has taken place.' using errcode = 'P0001';
  end if;

  insert into public.ratings (request_id, student_id, scribe_id, stars, feedback)
  values (v_request.id, v_request.student_id, v_request.scribe_id, p_stars, nullif(btrim(p_feedback), ''));
exception
  when unique_violation then
    raise exception 'You have already rated this exam.' using errcode = 'P0001';
end;
$$;

-- The signed-in student's requests, with scribe contact once accepted.
create function public.student_requests()
returns table (
  id uuid,
  status text,
  subject text,
  exam_date date,
  start_time time,
  end_time time,
  centre_name text,
  centre_address text,
  question_medium text,
  min_qualification_level smallint,
  blocked_backgrounds text[],
  notes text,
  created_at timestamptz,
  accepted_at timestamptz,
  scribe_name text,
  scribe_mobile text,
  scribe_qualification text,
  scribe_city text,
  scribe_rating numeric,
  scribe_rating_count bigint,
  my_rating smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.status, r.subject, r.exam_date, r.start_time, r.end_time,
         r.centre_name, r.centre_address, r.question_medium, r.min_qualification_level,
         r.blocked_backgrounds, r.notes, r.created_at, r.accepted_at,
         s.full_name, s.mobile, s.qualification, s.city,
         (select round(avg(x.stars), 1) from public.ratings x where x.scribe_id = s.id),
         (select count(*) from public.ratings x where x.scribe_id = s.id),
         rt.stars
  from public.exam_requests r
  left join public.scribes s on s.id = r.scribe_id and r.status = 'accepted'
  left join public.ratings rt on rt.request_id = r.id
  where r.student_id = auth.uid()
  order by r.exam_date desc, r.start_time desc;
$$;

-- The signed-in scribe's accepted exams, with student contact.
create function public.scribe_assignments()
returns table (
  id uuid,
  subject text,
  exam_date date,
  start_time time,
  end_time time,
  centre_name text,
  centre_address text,
  question_medium text,
  notes text,
  accepted_at timestamptz,
  student_name text,
  student_mobile text,
  institution text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.subject, r.exam_date, r.start_time, r.end_time, r.centre_name,
         r.centre_address, r.question_medium, r.notes, r.accepted_at,
         st.full_name, st.mobile, st.institution
  from public.exam_requests r
  join public.students st on st.id = r.student_id
  where r.scribe_id = auth.uid()
    and r.status = 'accepted'
  order by r.exam_date, r.start_time;
$$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------
-- Supabase grants broad table and function privileges to anon/authenticated by
-- default. Narrow them to exactly what the app uses; RLS applies on top.

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update on public.students, public.scribes to authenticated;
grant select, insert on public.exam_requests to authenticated;
grant select on public.ratings to authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;
-- is_admin() is used inside RLS policies and today_ist() inside the insert
-- trigger, so the signed-in role needs to call them.
grant execute on function
  public.is_admin(),
  public.today_ist(),
  public.eligible_requests(),
  public.accept_request(uuid),
  public.withdraw_from_request(uuid),
  public.cancel_request(uuid),
  public.rate_scribe(uuid, smallint, text),
  public.student_requests(),
  public.scribe_assignments()
to authenticated;
