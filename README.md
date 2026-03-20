# Plank Market

Plank Market is a Vite + React trading UI for short-window BTC up/down markets.

## Local development

1. Install dependencies:
   `npm install`
2. Start the frontend dev server:
   `npm run dev`
3. In a second terminal, run the API-compatible local server if needed:
   `npm run dev:server`

## Deployment

The app is configured to run on Vercel as a static frontend with serverless API routes under `/api`. Live BTC pricing is fetched on demand from Binance's public market data endpoints.

## Trading model

- `/api/market/state` returns the current BTC price, 1-second history, cycle lock prices, open orders, and user predictions.
- `/api/order` accepts market and limit orders.
- `/api/orders` returns orders and predictions for a connected wallet.
- `/api/order/[id]` cancels open limit orders.

> Note: without a shared external database, orders are stored in process memory. This works for local development and warm serverless instances, but you should add durable storage before treating it as production-grade custody or matching infrastructure.
