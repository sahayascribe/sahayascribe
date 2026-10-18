-- RLS and workflow tests. Run with scripts/test-db.sh.
\set ON_ERROR_STOP on
\set QUIET on
-- Only \echo progress lines are printed.
\o /dev/null

-- ---------------------------------------------------------------------------
-- Helpers (created as superuser, callable by the test roles)
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.throws(p_sql text, p_expected text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm not ilike '%' || p_expected || '%' then
      raise exception 'FAIL: % raised "%" but expected "%"', p_sql, sqlerrm, p_expected;
    end if;
    return;
  end;
  raise exception 'FAIL: expected error "%" from: %', p_expected, p_sql;
end;
$$;

create function tests.eq(p_actual anyelement, p_expected anyelement, p_label text)
returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (got %, expected %)', p_label, p_actual, p_expected;
  end if;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated;

-- Test users
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com', now()),     -- student
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com', now()),       -- student
  ('00000000-0000-0000-0000-000000000001', 'sam@example.com', now()),       -- eligible scribe
  ('00000000-0000-0000-0000-000000000002', 'artie@example.com', now()),     -- Arts (blocked)
  ('00000000-0000-0000-0000-000000000003', 'kiran@example.com', now()),     -- Kannada only
  ('00000000-0000-0000-0000-000000000004', 'tenth@example.com', now()),     -- 10th pass only
  ('00000000-0000-0000-0000-000000000005', 'sara@example.com', now()),      -- second eligible scribe
  ('00000000-0000-0000-0000-0000000000ad', 'FHemanshu@gmail.com', now()),   -- admin (case differs)
  ('00000000-0000-0000-0000-0000000000af', 'rishabh@sahayascribe.com', null); -- admin email, unconfirmed

\set alice '00000000-0000-0000-0000-00000000000a'
\set bob   '00000000-0000-0000-0000-00000000000b'
\set sam   '00000000-0000-0000-0000-000000000001'
\set artie '00000000-0000-0000-0000-000000000002'
\set kiran '00000000-0000-0000-0000-000000000003'
\set tenth '00000000-0000-0000-0000-000000000004'
\set sara  '00000000-0000-0000-0000-000000000005'
\set admin '00000000-0000-0000-0000-0000000000ad'
\set fake_admin '00000000-0000-0000-0000-0000000000af'

\set as_anon 'reset role; select set_config(''request.jwt.claim.sub'', '''', false); set role anon;'
\set as_alice 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-00000000000a'', false); set role authenticated;'
\set as_bob 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-00000000000b'', false); set role authenticated;'
\set as_sam 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-000000000001'', false); set role authenticated;'
\set as_artie 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-000000000002'', false); set role authenticated;'
\set as_kiran 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-000000000003'', false); set role authenticated;'
\set as_tenth 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-000000000004'', false); set role authenticated;'
\set as_sara 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-000000000005'', false); set role authenticated;'
\set as_admin 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-0000000000ad'', false); set role authenticated;'
\set as_fake_admin 'reset role; select set_config(''request.jwt.claim.sub'', ''00000000-0000-0000-0000-0000000000af'', false); set role authenticated;'
\set as_super 'reset role; select set_config(''request.jwt.claim.sub'', '''', false);'

\echo '1. Registration'
:as_alice
insert into public.students (full_name, mobile, institution, semester_year, medium)
values ('Alice Kumar', '9000000001', 'Govt College', 'Semester 4', 'English');
select tests.throws($$insert into public.students (id, full_name, mobile, institution, semester_year, medium)
  values ('00000000-0000-0000-0000-00000000000b', 'Impostor', '9000000009', 'X College', '1', 'English')$$,
  'row-level security');
select tests.throws($$insert into public.students (full_name, mobile, institution, semester_year, medium)
  values ('Alice Again', '9000000002', 'Govt College', '1', 'English')$$, 'duplicate key');
select tests.throws($$update public.students set certificate_path = '00000000-0000-0000-0000-00000000000b/cert.pdf'$$,
  'check constraint');
select tests.throws($$insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level,
  qualification, background, writing_mediums, id_document_path)
  values ('Alice', '9000000003', 20, 'Bengaluru', 'College Student', 3, 'BA', 'Arts', '{English}',
  '00000000-0000-0000-0000-00000000000a/id.pdf')$$, 'already registered as a student');

:as_bob
insert into public.students (full_name, mobile, institution, semester_year, medium)
values ('Bob Rao', '9000000010', 'City School', 'Class 10', 'Kannada');
select tests.throws($$insert into public.students (full_name, mobile, institution, semester_year, medium)
  values ('Bob', '12345', 'City School', '1', 'English')$$, 'check constraint');

:as_sam
insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level, qualification,
  background, writing_mediums, id_document_path)
values ('Sam Shetty', '9100000001', 24, 'Bengaluru', 'Working Professional', 3, 'BCom', 'Commerce',
  '{English,Kannada}', '00000000-0000-0000-0000-000000000001/id.pdf');
select tests.throws($$insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level,
  qualification, background, writing_mediums, id_document_path)
  values ('Sam2', '9100000099', 24, 'Bengaluru', 'Working Professional', 3, 'BCom', 'Commerce',
  '{English}', '00000000-0000-0000-0000-00000000000a/id.pdf')$$, 'check constraint');
:as_artie
insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level, qualification,
  background, writing_mediums, id_document_path)
values ('Artie', '9100000002', 22, 'Mysuru', 'College Student', 3, 'BA', 'Arts', '{English}',
  '00000000-0000-0000-0000-000000000002/id.pdf');
:as_kiran
insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level, qualification,
  background, writing_mediums, id_document_path)
values ('Kiran', '9100000003', 22, 'Mysuru', 'College Student', 3, 'BSc', 'Science', '{Kannada}',
  '00000000-0000-0000-0000-000000000003/id.pdf');
select tests.throws($$insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level,
  qualification, background, writing_mediums, id_document_path)
  values ('Too Young', '9100000077', 12, 'Mysuru', 'School Student', 1, 'SSLC', 'Science', '{Kannada}',
  '00000000-0000-0000-0000-000000000003/id.pdf')$$, 'check constraint');
:as_tenth
insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level, qualification,
  background, writing_mediums, id_document_path)
values ('Tenth', '9100000004', 16, 'Mysuru', 'School Student', 1, 'SSLC', 'Science', '{English}',
  '00000000-0000-0000-0000-000000000004/id.pdf');
:as_sara
insert into public.scribes (full_name, mobile, age, city, occupation, qualification_level, qualification,
  background, writing_mediums, id_document_path)
values ('Sara', '9100000005', 30, 'Bengaluru', 'Working Professional', 4, 'MA', 'Science', '{English}',
  '00000000-0000-0000-0000-000000000005/id.pdf');

\echo '2. Signed-out visitors see nothing'
:as_anon
select tests.throws('select * from public.students', 'permission denied');
select tests.throws('select * from public.scribes', 'permission denied');
select tests.throws('select * from public.exam_requests', 'permission denied');
select tests.throws('select * from public.admins', 'permission denied');
select tests.throws('select * from public.eligible_requests()', 'permission denied');
select tests.throws('select public.accept_request(gen_random_uuid())', 'permission denied');
select tests.throws($$insert into public.students (id, full_name, mobile, institution, semester_year, medium)
  values ('00000000-0000-0000-0000-00000000000b', 'X', '9000000055', 'X', '1', 'English')$$, 'permission denied');

\echo '3. Profiles are private'
:as_alice
select tests.eq((select count(*) from public.students), 1::bigint, 'student sees only own profile');
select tests.eq((select count(*) from public.scribes), 0::bigint, 'student cannot see scribes');
select tests.throws('select * from public.admins', 'permission denied');
select tests.eq(public.is_admin(), false, 'student is not admin');
update public.students set full_name = 'Bob Hacked' where id = :'bob';
:as_sam
select tests.eq((select count(*) from public.students), 0::bigint, 'scribe cannot see students');
select tests.eq((select count(*) from public.scribes), 1::bigint, 'scribe sees only own profile');
:as_super
select tests.eq((select full_name from public.students where id = :'bob'), 'Bob Rao', 'cannot update another profile');

\echo '4. Creating exam requests'
:as_alice
insert into public.exam_requests (exam_date, start_time, end_time, centre_name, centre_address, subject,
  question_medium, min_qualification_level, blocked_backgrounds, notes, status, scribe_id)
values (public.today_ist() + 7, '10:00', '13:00', 'Govt First Grade College', 'MG Road, Bengaluru',
  'Economics', 'English', 3, '{Arts}', 'Reach 30 minutes early', 'accepted',
  '00000000-0000-0000-0000-000000000001');
select tests.eq((select status from public.exam_requests), 'open', 'client cannot preset status');
select tests.eq((select scribe_id from public.exam_requests), null::uuid, 'client cannot preset scribe');
select tests.throws($$insert into public.exam_requests (exam_date, start_time, end_time, centre_name,
  centre_address, subject, question_medium, min_qualification_level)
  values (public.today_ist() - 1, '10:00', '13:00', 'Centre', 'Some address', 'Maths', 'English', 1)$$,
  'cannot be in the past');
select tests.throws($$insert into public.exam_requests (exam_date, start_time, end_time, centre_name,
  centre_address, subject, question_medium, min_qualification_level)
  values (public.today_ist() + 1, '13:00', '10:00', 'Centre', 'Some address', 'Maths', 'English', 1)$$,
  'check constraint');
select tests.throws($$insert into public.exam_requests (student_id, exam_date, start_time, end_time,
  centre_name, centre_address, subject, question_medium, min_qualification_level)
  values ('00000000-0000-0000-0000-00000000000b', public.today_ist() + 1, '10:00', '13:00', 'Centre',
  'Some address', 'Maths', 'English', 1)$$, 'row-level security');
select tests.throws($$update public.exam_requests set status = 'accepted'$$, 'permission denied');
select tests.throws($$delete from public.exam_requests$$, 'permission denied');
select id as econ from public.exam_requests \gset

:as_bob
select tests.eq((select count(*) from public.exam_requests), 0::bigint, 'other student cannot see request');
select tests.eq((select count(*) from public.student_requests()), 0::bigint, 'other student RPC is empty');
insert into public.exam_requests (exam_date, start_time, end_time, centre_name, centre_address, subject,
  question_medium, min_qualification_level)
values (public.today_ist() + 7, '11:00', '12:00', 'City School', 'Station Road, Mysuru', 'Science',
  'English', 1);
select id as sci from public.exam_requests \gset

\echo '5. Eligibility filtering'
:as_sam
select tests.eq((select count(*) from public.exam_requests), 0::bigint, 'scribe cannot read requests table');
select tests.eq((select count(*) from public.eligible_requests()), 2::bigint, 'eligible scribe sees both');
select tests.eq((select student_name from public.eligible_requests() where id = :'econ'), 'Alice', 'first name only');
:as_artie
select tests.eq((select count(*) from public.eligible_requests() where id = :'econ'), 0::bigint, 'blocked background hidden');
select tests.eq((select count(*) from public.eligible_requests() where id = :'sci'), 1::bigint, 'unblocked request shown');
select tests.throws(format('select public.accept_request(%L)', :'econ'), 'no longer available');
:as_kiran
select tests.eq((select count(*) from public.eligible_requests()), 0::bigint, 'wrong medium hidden');
select tests.throws(format('select public.accept_request(%L)', :'econ'), 'no longer available');
:as_tenth
select tests.eq((select count(*) from public.eligible_requests() where id = :'econ'), 0::bigint, 'low qualification hidden');
select tests.eq((select count(*) from public.eligible_requests() where id = :'sci'), 1::bigint, '10th pass ok for 10th request');
:as_alice
select tests.throws(format('select public.accept_request(%L)', :'econ'), 'register as a scribe');

\echo '6. Accepting, contact sharing and overlap'
:as_sam
select public.accept_request(:'econ');
select tests.eq((select count(*) from public.exam_requests), 1::bigint, 'assigned scribe can read own request');
select tests.eq((select student_mobile from public.scribe_assignments()), '9000000001', 'scribe gets student mobile');
select tests.eq((select count(*) from public.eligible_requests() where id = :'sci'), 0::bigint, 'overlapping exam hidden');
select tests.throws(format('select public.accept_request(%L)', :'sci'), 'no longer available');
select tests.eq((select count(*) from public.students), 0::bigint, 'still no direct student access');
:as_sara
select tests.eq((select count(*) from public.eligible_requests() where id = :'econ'), 0::bigint, 'accepted request hidden');
select tests.throws(format('select public.accept_request(%L)', :'econ'), 'no longer available');
select tests.eq((select count(*) from public.scribe_assignments()), 0::bigint, 'other scribe has no assignment');
select tests.throws(format('select public.withdraw_from_request(%L)', :'econ'), 'own upcoming');
:as_alice
select tests.eq((select scribe_mobile from public.student_requests()), '9100000001', 'student gets scribe mobile');
select tests.eq((select status from public.student_requests()), 'accepted', 'student sees accepted');
:as_bob
select tests.eq((select scribe_mobile from public.student_requests()), null::text, 'open request has no scribe contact');
select tests.throws(format('select public.cancel_request(%L)', :'econ'), 'own upcoming');

\echo '7. Withdraw and cancel'
:as_sam
select public.withdraw_from_request(:'econ');
select tests.eq((select count(*) from public.scribe_assignments()), 0::bigint, 'withdrawn');
:as_alice
select tests.eq((select status from public.student_requests()), 'open', 'request reopened after withdraw');
select tests.eq((select scribe_mobile from public.student_requests()), null::text, 'contact hidden after withdraw');
:as_sara
select public.accept_request(:'econ');
:as_alice
select public.cancel_request(:'econ');
select tests.eq((select status from public.student_requests()), 'cancelled', 'cancelled');
select tests.eq((select scribe_mobile from public.student_requests()), null::text, 'contact hidden after cancel');
:as_sara
select tests.eq((select count(*) from public.scribe_assignments()), 0::bigint, 'cancelled not assigned');
select tests.eq((select count(*) from public.eligible_requests() where id = :'econ'), 0::bigint, 'cancelled not listed');

\echo '8. Ratings'
:as_sam
select public.accept_request(:'sci');
:as_bob
select tests.throws(format('select public.rate_scribe(%L, 5::smallint)', :'sci'), 'after your exam');
:as_super
update public.exam_requests set exam_date = public.today_ist() - 1 where id = :'sci';
:as_alice
select tests.throws(format('select public.rate_scribe(%L, 5::smallint)', :'sci'), 'after your exam');
:as_bob
select tests.throws(format('select public.rate_scribe(%L, 9::smallint)', :'sci'), 'check constraint');
select public.rate_scribe(:'sci', 5::smallint, 'Very helpful');
select tests.throws(format('select public.rate_scribe(%L, 4::smallint)', :'sci'), 'already rated');
select tests.throws($$insert into public.ratings (request_id, student_id, scribe_id, stars) values
  (gen_random_uuid(), auth.uid(), '00000000-0000-0000-0000-000000000001', 1)$$, 'permission denied');
select tests.eq((select my_rating from public.student_requests()), 5::smallint, 'own rating shown');
select tests.eq((select scribe_rating from public.student_requests()), 5.0, 'average shown');
:as_sam
select tests.eq((select count(*) from public.ratings), 1::bigint, 'scribe sees own rating');
select tests.throws(format('select public.withdraw_from_request(%L)', :'sci'), 'own upcoming');
:as_sara
select tests.eq((select count(*) from public.ratings), 0::bigint, 'other scribe cannot see rating');

\echo '9. Admin access'
:as_admin
select tests.eq(public.is_admin(), true, 'admin recognised (email case-insensitive)');
select tests.eq((select count(*) from public.students), 2::bigint, 'admin sees all students');
select tests.eq((select count(*) from public.scribes), 5::bigint, 'admin sees all scribes');
select tests.eq((select count(*) from public.exam_requests), 2::bigint, 'admin sees all requests');
select tests.eq((select count(*) from public.ratings), 1::bigint, 'admin sees ratings');
select tests.throws('select * from public.admins', 'permission denied');
:as_fake_admin
select tests.eq(public.is_admin(), false, 'unconfirmed admin email is not admin');
select tests.eq((select count(*) from public.students), 0::bigint, 'unconfirmed admin sees nothing');

\echo '10. Document storage'
:as_super
\ir ../migrations/20261018000002_document_storage.sql
:as_alice
insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-0000-0000-00000000000a/cert.pdf');
select tests.throws($$insert into storage.objects (bucket_id, name)
  values ('documents', '00000000-0000-0000-0000-00000000000b/evil.pdf')$$, 'row-level security');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('documents', 'cert.pdf')$$,
  'row-level security');
select tests.eq((select count(*) from storage.objects), 1::bigint, 'owner sees own file');
:as_bob
select tests.eq((select count(*) from storage.objects), 0::bigint, 'others cannot see file');
delete from storage.objects;
:as_anon
select tests.eq((select count(*) from storage.objects), 0::bigint, 'anon cannot see file');
:as_admin
select tests.eq((select count(*) from storage.objects), 1::bigint, 'admin can see file');
:as_super
select tests.eq((select public from storage.buckets where id = 'documents'), false, 'bucket is private');

\echo '11. Deleting a scribe reopens their exams'
:as_super
update public.exam_requests set exam_date = public.today_ist() + 3 where id = :'sci';
delete from auth.users where id = :'sam';
select tests.eq((select status from public.exam_requests where id = :'sci'), 'open', 'orphaned request reopened');

\echo 'ALL RLS TESTS PASSED'
