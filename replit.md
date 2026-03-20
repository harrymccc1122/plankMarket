# Plank Market

A prediction market web application for BTC/USD price direction trading with short time horizons (5 seconds to 5 minutes).

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express.js server with in-memory trade store
- **Combined server**: `server.ts` runs both the Express API and Vite dev server middleware in a single process

## Key Files

- `server.ts` — Express server that combines API routes + Vite middleware
- `vite.config.ts` — Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
- `src/App.tsx` — Main React app entry point
- `src/lib/marketData.ts` — Fetches live BTC/USD price from Binance API
- `src/lib/tradeStore.ts` — In-memory order and prediction store
- `src/components/` — UI components (Header, BettingPanel, PriceChart, etc.)
- `src/types.ts` — Shared TypeScript types

## Running

- **Dev**: `npm run dev:server` (starts combined Express + Vite server on port 5000)
- **Build**: `npm run build` (Vite build to `dist/`)
- **Production**: `NODE_ENV=production npx tsx server.ts` (serves built dist/)

## External Dependencies

- **Binance API**: Used for live BTC/USD price data (`api.binance.com`). May be geo-restricted in some environments.
- **WalletConnect / RainbowKit**: Web3 wallet connectivity
- **wagmi + viem**: Ethereum interaction libraries

## Deployment

- Target: VM (needs persistent in-memory state for trade store)
- Build: `npm run build`
- Run: `npx tsx server.ts`
- Port: 5000

## Notes

- The app uses an in-memory store for orders/predictions — data is lost on server restart
- Market data is fetched from Binance API in real-time; access may be restricted in some network environments
