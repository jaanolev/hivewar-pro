# Supabase setup

This directory holds the SQL migrations that define the cloud schema for HiveWar Pro.

## One-time setup

1. Create a project at https://supabase.com (free tier is fine).
2. In **Project Settings → API**, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`
3. Create `.env.local` in the repo root (see `.env.example`) and paste those two values.
4. Add the same two env vars to Vercel (**Project Settings → Environment Variables**) for Production, Preview, and Development.
5. In **Auth → Providers**, enable **Anonymous Sign-Ins** (one toggle).
   Discord and Google OAuth come in a later step — leave them off for now.

## Running migrations

The simplest path: open **SQL Editor** in the Supabase dashboard, paste the
contents of each file in `supabase/migrations/` in order, and run.

Migrations are idempotent (`create table if not exists`, `drop trigger if exists`, etc.),
so re-running them is safe.

## Verifying the connection

After the SQL has run and `.env.local` is in place, start the dev server
(`npm run dev`) and confirm there are no Supabase env-var errors in the
browser console. Auth wiring (anonymous bootstrap) ships in step 2.
