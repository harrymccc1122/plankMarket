# Plank Market

Plank is a Vite + React BTC micro-prediction market UI with a lightweight backend order book.

## What changed

- Live BTC pricing now comes from Coinbase spot data via server-side API routes.
- Orders and positions are served through Vercel-compatible `/api/*` functions.
- Limit orders, market order matching, cancellations, and automatic settlement are handled in the backend.
- Optional Vercel KV persistence keeps trades and open orders across serverless invocations.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set values if needed.
3. Start the app:
   ```bash
   npm run dev
   ```

## Deploying on Vercel

Add these environment variables in Vercel if you want persistent trading state:

- `VITE_WALLETCONNECT_PROJECT_ID`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

If KV is not configured, the UI still works locally, but trade state will reset when a serverless function is cold-started.
