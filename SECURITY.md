# Security & Data Privacy Policy

## Client-Side Keys vs. Private Secrets
- **Allowed in Frontend (`js/state.js`):** Only the public Supabase Project URL and `anon` public key are used in browser code. Access is governed by PostgreSQL Row-Level Security (RLS) policies defined in `supabase/schema.sql`.
- **Never Commit to GitHub:** Do not commit `.env` files, Supabase `service_role` keys, or private webhook secrets. Store Edge Function secrets exclusively in **Supabase Dashboard → Project Settings → Edge Functions**.

## Staff Access & PIN Hygiene
- Change all default staff and volunteer PINs under **Admin & Reports → Team Roster** immediately after deployment.
- Lock the kitchen tablet screen (`Lock` button in the top bar) whenever stepping away from the prep or receiving station.
