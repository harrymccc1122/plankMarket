import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { creditBalance } from './balanceStore';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const POLL_INTERVAL_MS = 12_000;
const STARTUP_LOOKBACK_BLOCKS = 30n;

const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)',
);

const RPC_URLS = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon.drpc.org',
];

declare global {
  var __plankWatcherStarted: boolean | undefined;
  var __plankLastScannedBlock: bigint | undefined;
  var __plankProcessedTxs: Set<string> | undefined;
}

function getProcessedTxs(): Set<string> {
  if (!globalThis.__plankProcessedTxs) globalThis.__plankProcessedTxs = new Set();
  return globalThis.__plankProcessedTxs;
}

function getSiteWalletAddress(): string {
  const pk = process.env.SITE_WALLET_PK;
  if (!pk) throw new Error('SITE_WALLET_PK not configured');
  const key = (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`;
  return privateKeyToAccount(key).address;
}

async function tryRpc<T>(fn: (client: ReturnType<typeof createPublicClient>) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const url of RPC_URLS) {
    try {
      const client = createPublicClient({ chain: polygon, transport: http(url, { timeout: 10_000 }) });
      return await fn(client);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function pollDeposits(siteWalletAddress: string) {
  try {
    await tryRpc(async (client) => {
      const latestBlock = await client.getBlockNumber();

      if (!globalThis.__plankLastScannedBlock) {
        globalThis.__plankLastScannedBlock = latestBlock - STARTUP_LOOKBACK_BLOCKS;
      }

      const fromBlock = globalThis.__plankLastScannedBlock;
      if (latestBlock < fromBlock) return;

      const logs = await client.getLogs({
        address: USDC_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: siteWalletAddress as `0x${string}` },
        fromBlock,
        toBlock: latestBlock,
      });

      globalThis.__plankLastScannedBlock = latestBlock + 1n;

      const processedTxs = getProcessedTxs();

      for (const log of logs) {
        const txHash = log.transactionHash;
        if (!txHash || processedTxs.has(txHash)) continue;

        const from = log.args.from?.toLowerCase();
        const value = log.args.value;

        if (!from || value === undefined) continue;

        processedTxs.add(txHash);
        const usdcAmount = Number(formatUnits(value, 6));
        const newBalance = creditBalance(from, usdcAmount);

        console.log(
          `[DepositWatcher] +${usdcAmount} USDC from ${from} (tx: ${txHash}). Balance: $${newBalance.toFixed(2)}`,
        );
      }
    });
  } catch (err: any) {
    console.error('[DepositWatcher] Poll failed across all RPCs:', err?.message ?? err);
  }
}

export function startDepositWatcher() {
  if (globalThis.__plankWatcherStarted) return;
  globalThis.__plankWatcherStarted = true;

  let siteWalletAddress: string;
  try {
    siteWalletAddress = getSiteWalletAddress();
  } catch (err: any) {
    console.error('[DepositWatcher] Cannot start:', err.message);
    return;
  }

  console.log(`[DepositWatcher] Watching USDC → ${siteWalletAddress} on Polygon (polling every ${POLL_INTERVAL_MS / 1000}s)`);

  pollDeposits(siteWalletAddress);
  setInterval(() => pollDeposits(siteWalletAddress), POLL_INTERVAL_MS);
}

// Legacy stubs — no longer needed since we identify users by their sender address
export function registerDepositAddress(_depositAddress: string, _userId: string) {}
export function getDepositAddress(_userId: string): string | undefined { return undefined; }
