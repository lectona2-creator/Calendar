# Supabase account and sync setup

The app supports account-based synchronization through Supabase. Configure the project values below before enabling the account UI.

## 1. Create the Supabase project

Create a Supabase project at https://supabase.com and open **Project Settings → API**.

Copy the project URL and anonymous public key.

## 2. Add the client configuration

Open `website/supabase-config.js` and replace the empty values:

```js
window.DAILY_RITUAL_SUPABASE_CONFIG = {
  url: "https://YOUR-PROJECT-REF.supabase.co",
  anonKey: "YOUR-ANON-PUBLIC-KEY"
};
```

Never place a secret service role key in this file. The anonymous key is safe to expose to the browser when Row Level Security is enabled.

## 3. Create the table and policies

Run `website/supabase-schema.sql` in the Supabase SQL editor.

## 4. Enable account access

After configuration, the app will show Sign in and Create account controls. Data will sync between devices after signing in.

## Privacy note

Calendar records may contain health-related information. Keep Row Level Security enabled, use strong passwords or passkeys, and never use the service role key in browser code.
