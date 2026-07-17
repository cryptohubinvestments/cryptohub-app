# CryptoHub — Bitcoin Investment App

A Bitcoin investment platform with deposits, investments, withdrawals, referrals, and an admin dashboard.

## Tech Stack
- Expo Router (Web)
- Supabase (Database, Storage, Auth)
- TypeScript

## Environment Variables

Set these in your Vercel project settings (or `.env` locally):

```
EXPO_PUBLIC_SUPABASE_URL=https://ccqvlyffvgklqqrvxfsj.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Build

```bash
npm install
npm run build:web
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo in Vercel
3. Add the environment variables above in Vercel Project Settings > Environment Variables
4. Deploy — Vercel will run `npm run build:web` automatically

## Admin Access

- URL: `/admin`
- Username: `admin`
- Passcode: `000000`
