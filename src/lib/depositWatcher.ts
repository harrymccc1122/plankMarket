import { createPublicClient, http, parseAbiItem, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { creditBalance } from './balanceStore';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const POLL_INTERVAL_MS = 12_000;
const BLOCK_CONFIRMATIONS = 2n;
const STARTUP_LOOKBACK_BLOCKS = 30n;
const MAX_BLOCK_RANGE = 250n;

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
  var __plankProcessedDeposits: Set<string> | undefined;
  var __plankDepositPollInFlight: boolean | undefined;
}

function getProcessedDeposits(): Set<string> {
  if (!globalThis.__plankProcessedDeposits) globalThis.__plankProcessedDeposits = new Set();
  return globalThis.__plankProcessedDeposits;
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
  if (globalThis.__plankDepositPollInFlight) return;
  globalThis.__plankDepositPollInFlight = true;

  try {
    await tryRpc(async (client) => {
      const latestBlock = await client.getBlockNumber();
      const confirmedBlock = latestBlock > BLOCK_CONFIRMATIONS ? latestBlock - BLOCK_CONFIRMATIONS : 0n;

      if (!globalThis.__plankLastScannedBlock) {
        globalThis.__plankLastScannedBlock = confirmedBlock > STARTUP_LOOKBACK_BLOCKS
          ? confirmedBlock - STARTUP_LOOKBACK_BLOCKS
          : 0n;
      }

      const fromBlock = globalThis.__plankLastScannedBlock;
      if (confirmedBlock < fromBlock) return;

      const toBlock = fromBlock + MAX_BLOCK_RANGE < confirmedBlock
        ? fromBlock + MAX_BLOCK_RANGE
        : confirmedBlock;

      const logs = await client.getLogs({
        address: USDC_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: siteWalletAddress as `0x${string}` },
        fromBlock,
        toBlock,
      });

      globalThis.__plankLastScannedBlock = toBlock + 1n;

      const processedDeposits = getProcessedDeposits();

      for (const log of logs) {
        const txHash = log.transactionHash;
        const logIndex = log.logIndex;
        const depositKey = txHash && logIndex !== null ? `${txHash}:${logIndex}` : undefined;

        if (!depositKey || processedDeposits.has(depositKey)) continue;

        const from = log.args.from?.toLowerCase();
        const value = log.args.value;

        if (!from || value === undefined) continue;

        processedDeposits.add(depositKey);
        if (processedDeposits.size > 5_000) {
          const oldestKey = processedDeposits.values().next().value;
          if (oldestKey) processedDeposits.delete(oldestKey);
        }
        const usdcAmount = Number(formatUnits(value, 6));
        const newBalance = await creditBalance(from, usdcAmount);

        console.log(
          `[DepositWatcher] +${usdcAmount} USDC from ${from} (tx: ${txHash}). Balance: $${newBalance.toFixed(2)}`,
        );
      }
    });
  } catch (err: any) {
    console.error('[DepositWatcher] Poll failed across all RPCs:', err?.message ?? err);
  } finally {
    globalThis.__plankDepositPollInFlight = false;
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
