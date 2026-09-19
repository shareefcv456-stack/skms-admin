# skms-academy-admin

Dr. SKM's Academy admin dashboard — React 19, Tailwind CSS v4, Vite. Sign in with the backend's `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

- **Pricing & Plans:** edit, add or remove plans in all four programs. Save runs one transactional bulk-sync on the app database; removed plans are switched off, never deleted.
- **Review Inbox:** read, edit, approve (publishes to "What Our Students Say") or delete visitor reviews.
- **Student Reviews, Hero Banner, Announcement bar, Secondary Banner, Testimonials, Faculty, FAQs:** CMS editors. Save publishes immediately.
- **Enrollments:** Razorpay transactions and mobile-app access status.

## Run locally

```bash
echo 'VITE_API_URL="http://localhost:4000"' > .env   # VITE_SITE_URL defaults to http://localhost:5173
npm install
npm run dev               # http://localhost:5174
```

## Deploy (Vercel)

Import the repo (framework preset: Vite) and set `VITE_API_URL` and `VITE_SITE_URL`. `vercel.json` rewrites routes and sends `X-Robots-Tag: noindex`. Add this domain to the backend's `ADMIN_URL`.
