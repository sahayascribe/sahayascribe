# SahayaScribe features

## Working features (connected to the server)

### For students
1. **Student registration**: full name, 10-digit mobile number, school/college, semester or year, and medium of study (English, Kannada, Hindi, Tamil, Telugu, Other).
2. **One registration per mobile number**: a second registration with the same number is rejected.
3. **Book a scribe**: the student enters exam date, start and end time, centre name and address, subject, and question-paper language.
4. **Minimum scribe qualification**: 10th pass, 12th pass or Graduate.
5. **Block scribe backgrounds**: the student can exclude scribes from Science, Commerce or Arts. This stops a scribe with subject knowledge from influencing the answers.
6. **Additional notes**: hall instructions, entry time, centre contact.
7. **Remembers the student**: the browser keeps the registration, so exam requests are linked to the student automatically.

### For scribes
8. **Scribe registration**: name, mobile number, age (16+), city, role (school student, college student or working professional), qualification, background, and the languages they can write in.
9. **Browse eligible exams**: scribes see only open requests they qualify for. The checks are:
   - their background is not blocked by the student
   - they can write in the question-paper language
   - their qualification meets the student's minimum
10. **The scribe chooses, not the system**: there's no auto-matching. The scribe picks the exam and accepts it.
11. **Accept an exam**: the request is marked accepted and linked to that scribe, and it disappears from other scribes' lists.
12. **View location**: opens the exam centre address in Google Maps.
13. **Refresh list**: reloads the eligible requests.

### Accessibility
14. **High contrast mode** toggle
15. **Larger text** toggle
16. **Skip-to-content link**, ARIA labels, live regions for announcements, and focus moves to each screen's heading
17. **Atkinson Hyperlegible font**, designed for low-vision readers
18. **Toast notifications** that screen readers can announce

### Admin dashboard (`/admin.html`)
19. **Password-protected login**: the password is set when the server starts and isn't saved in files. Login is limited to 8 attempts per 15 minutes, and sessions last 8 hours.
20. **Hidden admin page**: not linked from the public site and set to "noindex" for search engines.
21. **Counts**: total students, total scribes, total registrations.
22. **Student and scribe tables** with tabs.
23. **Search** by name, mobile number, institution or city.
24. **Refresh and sign out**.

### Technical
25. **No dependencies**: runs on plain Node.js 20+.
26. **Data saved in a JSON file** (`data/registrations.json`), written safely through a temporary file.
27. **Basic security headers** (no framing, no sniffing, no referrer, no caching), plus input trimming and length limits.
28. **One-click Windows launcher** (`START-SAHAYASCRIBE.cmd`).
29. **Ready for Render hosting** (`render.yaml`, `DEPLOYMENT.md`).

## Shown in the design but not working yet

| Feature | Current state |
|---|---|
| Send OTP (phone verification) | Button only shows a "demo" message |
| Upload disability certificate / scribe ID | File picker shows, but the file is never sent or saved |
| Map pin for exam centre | Placeholder message |
| Language switcher (EN ⌄) | Does nothing |
| Sign in for returning users | Opens the dashboard without checking who you are |
| Student dashboard with upcoming exams | Fixed text ("Good morning, Ananya"); doesn't show real requests |
| "Scribe found" screen for the student | Mock data (Rahul Sharma); the student isn't told when a scribe accepts |
| "You've been matched" screen for the scribe | Mock data |
| Call / chat with scribe or student | Buttons do nothing |
| Cancel request, cancellation policy | Text only; there's no cancel logic |
| Automatic reminders (24h and 3h before the exam) | Mentioned only |
| Backup / standby scribe | Mentioned only |
| Ratings (1–5 stars + feedback) | Stars can be clicked, but nothing is saved |
| Verified volunteer badge | No verification process exists |
| Exam requests in the admin dashboard | Saved on the server but not shown to admin |
