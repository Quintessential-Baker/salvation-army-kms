# Supabase Backend & Edge Functions Setup

1. **Create Project:** Create a new project in Supabase and open **SQL Editor → New Query**.
2. **Run Schema:** Copy and execute the full contents of `supabase/schema.sql` to create all tables, triggers, and Row-Level Security (RLS) policies.
3. **Configure Site URL:** Under **Authentication → URL Configuration**, add your live GitHub Pages URL (`[https://quintessential-baker.github.io/salvation-army-kms/](https://quintessential-baker.github.io/salvation-army-kms/)`) to **Site URL** and **Redirect URLs**.
4. **Deploy Edge Functions (Optional):**
   ```bash
   supabase functions deploy notify-alert
   supabase functions deploy scrape-recipe
   ```
