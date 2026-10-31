# Fargo portfolio

Cinematic portfolio (React, Three.js, GSAP, Lenis) with an admin panel at `/admin` that edits every word, link, colour, project and skill on the site.

## Deploy on Vercel

1. Push this folder to a new GitHub repo.
2. In Vercel, click Add New, Project, and import the repo. Vercel detects Vite. Keep the defaults.
3. Open the project, go to **Storage**, add **Upstash for Redis** (free plan) and connect it to this project. Vercel adds the connection keys for you.
4. Go to **Settings, Environment Variables** and add:
   - `ADMIN_PASSWORD`: the password you will type at /admin
   - `ADMIN_SECRET`: any long random string (it signs your login cookie)
5. Redeploy. Your site is at `/` and the admin is at `/admin`.

## How it works

- `src/content.default.js` holds the original content. The site shows it until you save from the admin.
- `/api/content` reads and saves content in Redis. Saving needs a valid admin login.
- Every save keeps the previous version. Up to ten versions can be restored from Backup and history.
- The live site caches content for 30 seconds, so a save shows up within half a minute.
- The admin preview shows your unsaved edits before you publish them.

## Run locally

```
npm install
npm i -g vercel
vercel link        # connect to your Vercel project
vercel env pull    # downloads the Redis keys and admin password
npm run dev        # runs the site and the API together
```

`npm run dev:front` runs only the front end. The admin cannot save in that mode.
