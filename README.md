# Plank Market

Plank Market is a Vite + React trading UI for short-window BTC up/down markets.

## Local development

1. Install dependencies:
   `npm install`
2. Start the frontend dev server:
   `npm run dev`
3. In a second terminal, run the API-compatible local server if needed:
   `npm run dev:server`

## Persistence

The local server stores balances, orders, predictions, and settlement markers in a **local JSON database file** on your PC. By default the file is created at `./data/plank-market.json`, or you can override the path with `LOCAL_DB_FILE` in `.env`.

## Deployment

The app is configured to run on Vercel as a static frontend with serverless API routes under `/api`. Live BTC pricing is fetched on demand from Binance's public market data endpoints.

## Trading model

- `/api/market/state` returns the current BTC price, 1-second history, cycle lock prices, open orders, and user predictions.
- `/api/order` accepts market and limit orders.
- `/api/orders` returns orders and predictions for a connected wallet.
- `/api/order/[id]` cancels open limit orders.

> Note: this project now persists runtime state to a local file on the machine running `npm run dev:server`, so balances and orders survive process restarts as long as that file stays in place.
