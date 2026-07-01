# Make SahayaScribe live

Recommended simple hosting: Render.

## 1. Put this folder on GitHub

Upload only the files inside the `sahayascribe` folder.

Do not upload the `data` folder. It contains private student/scribe registrations and is ignored by `.gitignore`.

## 2. Create a Render Web Service

- Choose New Web Service.
- Connect your GitHub repository.
- Runtime: Node.
- Build command: `npm install`
- Start command: `npm start`

Add these environment variables:

- `HOST` = `0.0.0.0`
- `ADMIN_PASSWORD` = your private admin password
- `DATA_DIR` = `/var/data/sahayascribe`

Also add a persistent disk:

- Mount path: `/var/data`
- Size: 1 GB is enough for the demo stage

## 3. Connect your domain

In Render, add these custom domains:

- `sahayascribe.com`
- `www.sahayascribe.com`

Render will show DNS records. Copy those records into the DNS settings where you bought the domain.

Usually this means:

- one record for `sahayascribe.com`
- one CNAME record for `www`

After DNS updates, wait for propagation. It can take a few minutes, sometimes longer.

## 4. Open the live site

Public website:

`https://sahayascribe.com`

Private admin dashboard:

`https://sahayascribe.com/admin.html`

## Production caution

This setup is suitable for a live demo / pilot. For real long-term public use, move registrations to a hosted database like PostgreSQL and add real OTP/email verification before collecting sensitive data at scale.
