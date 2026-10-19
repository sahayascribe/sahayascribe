# SahayaScribe features

Version 2 (React + Supabase). Everything below is backed by the database and protected by
Row Level Security unless marked otherwise.

## Accounts
1. **Email one-time code sign-in**: no passwords. The same code creates a new account. (Phone OTP was removed.)
2. **One role per account**: an account is either a student or a scribe, enforced in the database.
3. **Sign out** from any page.
4. **My profile** for students and scribes: edit every registration detail (including mobile number) and replace
   the uploaded document; the old file is deleted. The login email cannot be changed. Scribes with accepted exams
   see a note that changes apply to future requests only.

## For students
5. **Student registration**: full name, 10-digit Indian mobile number, school/college, semester or year, medium of study.
6. **Disability certificate upload** (optional): PDF, JPG or PNG up to 5 MB, stored privately. Only the student and admins can open it.
7. **Book a scribe**: exam date (no past dates), start and end time, centre name and address, subject, question-paper language.
8. **Minimum scribe qualification**: 10th pass, 12th pass or Graduate.
9. **Block scribe backgrounds**: exclude scribes from Science, Commerce or Arts.
10. **Additional notes** for the scribe.
11. **Check the centre on Google Maps** while typing the address.
12. **Student dashboard**: real greeting, upcoming requests with live status (waiting / scribe confirmed), past and cancelled requests.
13. **Scribe details after a match**: name, qualification, city, average rating and phone number, with a "Call scribe" button.
14. **Cancel a request** (open or accepted, before the exam date), with the 12-hour cancellation policy shown.
15. **Rate the scribe** (1–5 stars + optional feedback) once the exam date has passed; one rating per exam.

## For scribes
16. **Scribe registration**: name, mobile, age (16+), city, occupation, highest qualification level, course/degree, background, languages they can write in (at least one).
17. **ID upload** (required): College ID or masked Aadhaar, stored privately. Only the scribe and admins can open it.
18. **Browse eligible exams**: only open, upcoming requests where
    - their background is not blocked,
    - they can write the question-paper language,
    - their qualification meets the minimum,
    - the time does not clash with an exam they already accepted.
19. **Scribe chooses**: no auto-matching. Accepting is checked again in the database, and two scribes cannot accept the same exam.
20. **Upcoming exams list** with student name, institution and phone number, "Contact student" and "View location".
21. **Withdraw** from an accepted exam before the exam date; the request reopens for other scribes.

## Privacy and security
22. Signed-out visitors cannot read any data.
23. Users can read and edit only their own profile.
24. Scribes never see the students table; open requests show only the student's first name and institution.
25. Phone numbers are visible only to the matched student and scribe, and to admins.
26. All request changes (accept, withdraw, cancel, rate) go through database functions that re-check the rules.
27. Documents live in a private storage bucket; each user can only write to their own folder.
28. Security headers on the site, including a Content Security Policy.
29. Automated RLS tests (`npm run test:db`).

## Accessibility
30. **High contrast mode** and **larger text** toggles, remembered on the device.
31. **Skip-to-content link**, labelled controls, live regions, and focus moves to each page's heading.
32. **Visible keyboard focus** on choice pills and upload boxes.
33. **Atkinson Hyperlegible font**.

## Admin dashboard (`/admin.html`)
34. **Admin sign-in with email code**, limited to `rishabh@sahayascribe.com` and `fhemanshu@gmail.com` (confirmed emails only).
35. **Not linked** from the public site and hidden from search engines.
36. **Counts**: students, scribes, open and accepted requests.
37. **Tables** for students, scribes and exam requests, with search and refresh.
38. **View uploaded documents** through short-lived (60-second) private links.

## Booking emails (Resend)
Sent from `notifications@notification.sahayascribe.com` within about a minute. Each email has an accessible HTML version and a plain-text version.

39. **Request is live** to the student after booking.
40. **Scribe accepted** to the student (scribe name, phone, qualification, city) and to the scribe (student name, phone, institution, centre and map link).
41. **Scribe withdrew** to the student: the request is open again.
42. **Exam cancelled** to the scribe when the student cancels an exam they had accepted.
43. **Reminder** to both the day before the exam, from 8 AM India time, with the other person's phone number.
44. **Rate your scribe** to the student once the exam has ended, if they have not rated yet.
45. Emails that are out of date when their turn comes (for example "scribe accepted" after the scribe has already withdrawn) are skipped. Failed sends are retried up to 5 times, and Resend never sends the same email twice.

## Not built yet
| Feature | Notes |
|---|---|
| Scribe ID verification by admin | Skipped for now, as decided. Scribes can browse as soon as they register. |
| SMS / WhatsApp notifications | Booking updates are sent by email only. |
| Email to scribes about new eligible requests | Scribes check their dashboard. |
| Backup / standby scribe | — |
| In-app chat | Users call each other directly after a match. |
| Language switcher (Kannada, Hindi, …) | The interface is English only. |
| Editing a request | Students can cancel and create a new request. |
| Changing the login email | Needs your own email sender first. |
| Account deletion by the user | Admins can delete accounts in Supabase. |
