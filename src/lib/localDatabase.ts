import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { Order, Prediction } from '../types';

type DatabaseShape = {
  balances: Record<string, number>;
  tradeStore: {
    orders: Order[];
    predictions: Prediction[];
    settledIds: string[];
  };
};

const DEFAULT_DB: DatabaseShape = {
  balances: {},
  tradeStore: {
    orders: [],
    predictions: [],
    settledIds: [],
  },
};

declare global {
  var __plankDbQueue: Promise<unknown> | undefined;
}

function getDatabaseFilePath(): string {
  return process.env.LOCAL_DB_FILE?.trim() || path.join(process.cwd(), 'data', 'plank-market.json');
}

async function ensureDatabaseFile(): Promise<string> {
  const filePath = getDatabaseFilePath();
  await mkdir(path.dirname(filePath), { recursive: true });

  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
  }

  return filePath;
}

function normalizeDatabaseShape(value: unknown): DatabaseShape {
  const candidate = typeof value === 'object' && value !== null ? value as Partial<DatabaseShape> : {};
  return {
    balances: typeof candidate.balances === 'object' && candidate.balances !== null ? candidate.balances as Record<string, number> : {},
    tradeStore: {
      orders: Array.isArray(candidate.tradeStore?.orders) ? candidate.tradeStore.orders : [],
      predictions: Array.isArray(candidate.tradeStore?.predictions) ? candidate.tradeStore.predictions : [],
      settledIds: Array.isArray(candidate.tradeStore?.settledIds) ? candidate.tradeStore.settledIds : [],
    },
  };
}

export async function readDatabase(): Promise<DatabaseShape> {
  const filePath = await ensureDatabaseFile();
  const raw = await readFile(filePath, 'utf8');

  try {
    return normalizeDatabaseShape(JSON.parse(raw));
  } catch {
    await writeDatabase(DEFAULT_DB);
    return structuredClone(DEFAULT_DB);
  }
}

export async function writeDatabase(next: DatabaseShape): Promise<void> {
  const filePath = await ensureDatabaseFile();
  await enqueueDatabaseTask(async () => {
    await writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
  });
}

export async function updateDatabase<T>(mutate: (current: DatabaseShape) => Promise<T> | T): Promise<T> {
  return enqueueDatabaseTask(async () => {
    const filePath = await ensureDatabaseFile();
    const raw = await readFile(filePath, 'utf8');
    let current = structuredClone(DEFAULT_DB);

    try {
      current = normalizeDatabaseShape(JSON.parse(raw));
    } catch {
      await writeFile(filePath, JSON.stringify(DEFAULT_DB, null, 2), 'utf8');
    }

    const result = await mutate(current);
    await writeFile(filePath, JSON.stringify(current, null, 2), 'utf8');
    return result;
  });
}

function enqueueDatabaseTask<T>(task: () => Promise<T>): Promise<T> {
  const previous = globalThis.__plankDbQueue ?? Promise.resolve();
  const nextTask = previous.then(task, task);
  globalThis.__plankDbQueue = nextTask.catch(() => undefined);
  return nextTask;
}
