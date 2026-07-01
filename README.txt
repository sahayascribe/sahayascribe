SAHAYASCRIBE — HOW TO RUN
==========================

1. Install the current Node.js LTS version from https://nodejs.org/ if it is not already installed.
2. Double-click START-SAHAYASCRIBE.cmd.
3. Create your private admin password when prompted. The password is not saved in the website files.
4. Keep the server window open while using the website.

Public student and scribe website:
http://127.0.0.1:4173

Private admin dashboard (not linked from the public website):
http://127.0.0.1:4173/admin.html

New scribe request flow:
- Students submit exam requests after registration.
- Scribes are not matched automatically.
- After scribe registration, they can open "Browse eligible exams" and choose an exam request.
- Requests blocked for the scribe's background are hidden. For example, if Arts is blocked, Arts scribes cannot see that request.

Registrations and exam requests are stored locally in data/registrations.json. Do not publish or share this file because it contains personal information.

TO MAKE IT LIVE
===============

See DEPLOYMENT.md in this folder. The project is now prepared for Node hosting with:
- package.json
- render.yaml
- .gitignore
- .env.example

Use the admin page at:
https://sahayascribe.com/admin.html

after the domain is connected to your hosting provider.

IMPORTANT FOR PRODUCTION
========================

This is a local working backend. Before putting SahayaScribe on the public internet, deploy it behind HTTPS, use a hosted database with encrypted backups, add real phone OTP verification, add administrator accounts with strong authentication, and define a privacy/data-retention policy. Disability certificates and Aadhaar documents should use protected private file storage rather than the local data folder.
