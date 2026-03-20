import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { polygon } from 'viem/chains';
import { creditBalance } from './balanceStore';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const USDC_ABI = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const RPC_URLS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon.drpc.org',
];

const client = createPublicClient({
  chain: polygon,
  transport: http(RPC_URLS[0]),
});

declare global {
  var __plankWatchedAddresses: Map<string, string> | undefined;
  var __plankProcessedTxs: Set<string> | undefined;
  var __plankWatcherStarted: boolean | undefined;
}

function getWatchedAddresses(): Map<string, string> {
  if (!globalThis.__plankWatchedAddresses) {
    globalThis.__plankWatchedAddresses = new Map();
  }
  return globalThis.__plankWatchedAddresses;
}

function getProcessedTxs(): Set<string> {
  if (!globalThis.__plankProcessedTxs) {
    globalThis.__plankProcessedTxs = new Set();
  }
  return globalThis.__plankProcessedTxs;
}

export function registerDepositAddress(depositAddress: string, userId: string) {
  getWatchedAddresses().set(depositAddress.toLowerCase(), userId.toLowerCase());
}

export function getDepositAddress(userId: string): string | undefined {
  const map = getWatchedAddresses();
  for (const [addr, uid] of map.entries()) {
    if (uid === userId.toLowerCase()) return addr;
  }
  return undefined;
}

export function startDepositWatcher() {
  if (globalThis.__plankWatcherStarted) return;
  globalThis.__plankWatcherStarted = true;

  console.log('[DepositWatcher] Starting USDC deposit watcher on Polygon...');

  client.watchContractEvent({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      const watchedAddresses = getWatchedAddresses();
      const processedTxs = getProcessedTxs();

      for (const log of logs) {
        const txHash = log.transactionHash;
        if (!txHash || processedTxs.has(txHash)) continue;

        const to = log.args.to?.toLowerCase();
        const value = log.args.value;

        if (!to || value === undefined) continue;

        const userId = watchedAddresses.get(to);
        if (!userId) continue;

        processedTxs.add(txHash);
        const usdcAmount = Number(formatUnits(value, 6));
        const newBalance = creditBalance(userId, usdcAmount);

        console.log(`[DepositWatcher] Deposit detected: ${usdcAmount} USDC -> ${userId} (tx: ${txHash}). New balance: ${newBalance}`);
      }
    },
    onError: (error) => {
      console.error('[DepositWatcher] Error watching events:', error.message);
    },
  });
}
