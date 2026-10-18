# SahayaScribe features

Version 2 (React + Supabase). Everything below is backed by the database and protected by
Row Level Security unless marked otherwise.

## Accounts
1. **Email one-time code sign-in**: no passwords. The same code creates a new account. (Phone OTP was removed.)
2. **One role per account**: an account is either a student or a scribe, enforced in the database.
3. **Sign out** from any page.

## For students
4. **Student registration**: full name, 10-digit Indian mobile number, school/college, semester or year, medium of study.
5. **Disability certificate upload** (optional): PDF, JPG or PNG up to 5 MB, stored privately. Only the student and admins can open it.
6. **Book a scribe**: exam date (no past dates), start and end time, centre name and address, subject, question-paper language.
7. **Minimum scribe qualification**: 10th pass, 12th pass or Graduate.
8. **Block scribe backgrounds**: exclude scribes from Science, Commerce or Arts.
9. **Additional notes** for the scribe.
10. **Check the centre on Google Maps** while typing the address.
11. **Student dashboard**: real greeting, upcoming requests with live status (waiting / scribe confirmed), past and cancelled requests.
12. **Scribe details after a match**: name, qualification, city, average rating and phone number, with a "Call scribe" button.
13. **Cancel a request** (open or accepted, before the exam date), with the 12-hour cancellation policy shown.
14. **Rate the scribe** (1–5 stars + optional feedback) once the exam date has passed; one rating per exam.

## For scribes
15. **Scribe registration**: name, mobile, age (16+), city, occupation, highest qualification level, course/degree, background, languages they can write in (at least one).
16. **ID upload** (required): College ID or masked Aadhaar, stored privately. Only the scribe and admins can open it.
17. **Browse eligible exams**: only open, upcoming requests where
    - their background is not blocked,
    - they can write the question-paper language,
    - their qualification meets the minimum,
    - the time does not clash with an exam they already accepted.
18. **Scribe chooses**: no auto-matching. Accepting is checked again in the database, and two scribes cannot accept the same exam.
19. **Upcoming exams list** with student name, institution and phone number, "Contact student" and "View location".
20. **Withdraw** from an accepted exam before the exam date; the request reopens for other scribes.

## Privacy and security
21. Signed-out visitors cannot read any data.
22. Users can read and edit only their own profile.
23. Scribes never see the students table; open requests show only the student's first name and institution.
24. Phone numbers are visible only to the matched student and scribe, and to admins.
25. All request changes (accept, withdraw, cancel, rate) go through database functions that re-check the rules.
26. Documents live in a private storage bucket; each user can only write to their own folder.
27. Security headers on the site, including a Content Security Policy.
28. Automated RLS tests (`npm run test:db`).

## Accessibility
29. **High contrast mode** and **larger text** toggles, remembered on the device.
30. **Skip-to-content link**, labelled controls, live regions, and focus moves to each page's heading.
31. **Visible keyboard focus** on choice pills and upload boxes.
32. **Atkinson Hyperlegible font**.

## Admin dashboard (`/admin.html`)
33. **Admin sign-in with email code**, limited to `rishabh@sahayascribe.com` and `fhemanshu@gmail.com` (confirmed emails only).
34. **Not linked** from the public site and hidden from search engines.
35. **Counts**: students, scribes, open and accepted requests.
36. **Tables** for students, scribes and exam requests, with search and refresh.
37. **View uploaded documents** through short-lived (60-second) private links.

## Not built yet
| Feature | Notes |
|---|---|
| Scribe ID verification by admin | Skipped for now, as decided. Scribes can browse as soon as they register. |
| Notifications (email/SMS) when a scribe accepts or cancels | Students see changes on their dashboard. |
| Automatic exam reminders | Needs a scheduled job and an email/SMS provider. |
| Backup / standby scribe | — |
| In-app chat | Users call each other directly after a match. |
| Language switcher (Kannada, Hindi, …) | The interface is English only. |
| Editing a profile or request | Students can cancel and create a new request. |
| Account deletion by the user | Admins can delete accounts in Supabase. |
