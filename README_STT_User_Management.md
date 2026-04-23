# STT User Management System
Date: 2026-04-22

This package adds a web-based staff user management system for your Next.js + Supabase POS.

## What it includes
- Admin-only staff management page
- Server-side user creation with Supabase Admin API
- Role updates
- Activate / deactivate users
- Password reset email trigger
- No browser-side raw signup flow

## Files
- `app/admin/users/page.tsx`
- `app/api/admin/staff/route.ts`
- `app/api/admin/staff/reset-password/route.ts`
- `lib/server/supabase-admin.ts`
- `sql/staff_profiles_rls.sql`

## Required environment variables
Add these in Vercel and local `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=https://your-live-domain.com
```

## Important
`SUPABASE_SERVICE_ROLE_KEY` must only be used server-side. Never expose it in browser code.

## Where to link it
You can add a button in your admin nav that links to:

- `/admin/users`

## Password reset
The reset password route sends a recovery email using your live app URL from `NEXT_PUBLIC_APP_URL`.

You still need a reset-password page in your app for the email flow to land on.
A simple future route can be:

- `/reset-password`

## Recommended next step
After adding these files, deploy and then sign in as an admin user. Open:

- `/admin/users`

There you can:
- create staff
- edit roles
- activate/deactivate
- send password reset email
