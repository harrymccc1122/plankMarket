declare global {
  var __plankBalances: Map<string, number> | undefined;
}

function getBalances(): Map<string, number> {
  if (!globalThis.__plankBalances) {
    globalThis.__plankBalances = new Map();
  }
  return globalThis.__plankBalances;
}

export function getBalance(userId: string): number {
  return getBalances().get(userId.toLowerCase()) ?? 0;
}

export function creditBalance(userId: string, amount: number): number {
  const balances = getBalances();
  const key = userId.toLowerCase();
  const current = balances.get(key) ?? 0;
  const next = current + amount;
  balances.set(key, next);
  return next;
}

export function debitBalance(userId: string, amount: number): number {
  const balances = getBalances();
  const key = userId.toLowerCase();
  const current = balances.get(key) ?? 0;
  if (current < amount) throw new Error('Insufficient balance');
  const next = current - amount;
  balances.set(key, next);
  return next;
}

export function setBalance(userId: string, amount: number): void {
  getBalances().set(userId.toLowerCase(), amount);
}
