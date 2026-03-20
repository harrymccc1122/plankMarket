# Plank Market

A prediction market web application for BTC/USD price direction trading with short time horizons (5 seconds to 5 minutes).

## Architecture

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Express.js server with in-memory trade/balance store
- **Combined server**: `server.ts` runs both the Express API and Vite dev server middleware in a single process
- **Blockchain**: Polygon (MATIC) network for USDC deposits/withdrawals via viem

## Key Files

- `server.ts` — Express server: API routes + Vite middleware, starts deposit watcher
- `vite.config.ts` — Vite config (port 5000, host 0.0.0.0, allowedHosts: true)
- `src/main.tsx` — Bootstrap: fetches config before rendering (WalletConnect project ID)
- `src/App.tsx` — Main React app entry point
- `src/lib/marketData.ts` — Fetches live BTC/USD price from CoinAPI
- `src/lib/tradeStore.ts` — In-memory order/prediction store; credits winnings to balance
- `src/lib/balanceStore.ts` — In-memory user USDC balance store
- `src/lib/depositWatcher.ts` — Watches USDC Transfer events on Polygon to detect deposits
- `src/lib/withdrawal.ts` — Sends USDC from site wallet to user address on Polygon
- `src/components/WalletModal.tsx` — Deposit/withdraw UI (Polymarket-style)
- `src/components/Header.tsx` — Shows balance button, opens wallet modal
- `src/components/BettingPanel.tsx` — Trading panel with deposit prompt if balance low
- `src/hooks/useBalance.ts` — Polls /api/balance every 5s
- `src/components/Web3Config.tsx` — RainbowKit + wagmi config on Polygon

## API Endpoints

- `GET /api/config` — Returns WalletConnect project ID to frontend
- `GET /api/market/state` — Live BTC price + order book
- `GET /api/balance?userId=` — User's USDC balance
- `GET /api/deposit-address?userId=` — Returns site wallet address for deposits
- `POST /api/withdraw` — Withdraws USDC from balance to user's wallet (gas paid by site)
- `POST /api/order` — Place market/limit order (debits balance)
- `DELETE /api/order/:id` — Cancel order (refunds balance)
- `GET /api/orders?userId=` — User's orders and predictions
- `GET /api/site-wallet` — Site wallet address

## Secrets Required

- `COINAPI_KEY` — CoinAPI key for live BTC/USD price data
- `SITE_WALLET_PK` — Site wallet private key (Polygon); pays gas on withdrawals; hold USDC here for payouts
- `WALLETCONNECT_PROJECT_ID` — WalletConnect cloud project ID for wallet connections

## Running

- **Dev**: `npm run dev:server` (starts combined Express + Vite server on port 5000)
- **Build**: `npm run build` (Vite build to `dist/`)
- **Production**: `NODE_ENV=production npx tsx server.ts`

## External Dependencies

- **CoinAPI** — Live BTC/USD price + OHLCV history
- **Polygon USDC** — `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` (native USDC on Polygon)
- **publicnode.com** — Free Polygon RPC for deposit watching and withdrawals
- **RainbowKit + wagmi** — Wallet connectivity on Polygon
- **viem** — Ethereum/Polygon blockchain interaction

## Deployment

- Target: VM (needs persistent in-memory state for trade/balance store)
- Build: `npm run build`
- Run: `npx tsx server.ts`
- Port: 5000

## Notes

- All balances are in-memory and lost on server restart — use a DB for production persistence
- Deposit detection polls Polygon blocks with `getLogs` for USDC transfers into the site wallet; the sender wallet address is used as the user ID to credit the in-memory balance
- Winnings from predictions are automatically credited back to user balance when positions settle
- The site wallet must hold USDC on Polygon to fund withdrawals
