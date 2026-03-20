import { createWalletClient, createPublicClient, http, parseAbi, parseUnits, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { debitBalance } from './balanceStore';

const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;
const USDC_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

function getSiteWallet() {
  const pk = process.env.SITE_WALLET_PK;
  if (!pk) throw new Error('SITE_WALLET_PK not configured');
  const key = pk.startsWith('0x') ? pk : `0x${pk}`;
  return privateKeyToAccount(key as `0x${string}`);
}

const publicClient = createPublicClient({
  chain: polygon,
  transport: http('https://polygon-bor-rpc.publicnode.com'),
});

export async function getSiteWalletAddress(): Promise<string> {
  return getSiteWallet().address;
}

export async function processWithdrawal(userId: string, toAddress: string, amount: number): Promise<string> {
  if (amount <= 0) throw new Error('Amount must be greater than 0');
  if (amount < 1) throw new Error('Minimum withdrawal is 1 USDC');

  debitBalance(userId, amount);

  try {
    const account = getSiteWallet();
    const walletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http('https://polygon-bor-rpc.publicnode.com'),
    });

    const usdcAmount = parseUnits(amount.toFixed(6), 6);

    const data = encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [toAddress as `0x${string}`, usdcAmount],
    });

    const hash = await walletClient.sendTransaction({
      to: USDC_ADDRESS,
      data,
    });

    console.log(`[Withdrawal] ${amount} USDC -> ${toAddress} | tx: ${hash}`);
    return hash;
  } catch (err) {
    debitBalance(userId, -amount);
    throw err;
  }
}
