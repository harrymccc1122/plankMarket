import { readDatabase, updateDatabase } from './localDatabase';

function balanceKey(userId: string) {
  return userId.toLowerCase();
}

export async function getBalance(userId: string): Promise<number> {
  const database = await readDatabase();
  const value = database.balances[balanceKey(userId)];
  return typeof value === 'number' ? value : 0;
}

export async function creditBalance(userId: string, amount: number): Promise<number> {
  return updateDatabase((database) => {
    const key = balanceKey(userId);
    const currentBalance = database.balances[key] ?? 0;
    const nextBalance = currentBalance + amount;
    database.balances[key] = nextBalance;
    return nextBalance;
  });
}

export async function debitBalance(userId: string, amount: number): Promise<number> {
  return updateDatabase((database) => {
    const key = balanceKey(userId);
    const currentBalance = database.balances[key] ?? 0;
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const nextBalance = currentBalance - amount;
    database.balances[key] = nextBalance;
    return nextBalance;
  });
}

export async function setBalance(userId: string, amount: number): Promise<void> {
  await updateDatabase((database) => {
    database.balances[balanceKey(userId)] = amount;
  });
}
