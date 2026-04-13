import Dexie, { Table } from 'dexie';

export interface BingoGame {
  id?: number;
  gameId: string;
  gameType: 75 | 90;
  drawnNumbers: number[];
  currentNumber: number | null;
  status: 'active' | 'completed';
  createdAt: number;
  updatedAt: number;
  syncedAt: number | null;
}

class BingoDatabase extends Dexie {
  games!: Table<BingoGame>;

  constructor() {
    super('BingoPlayDB');
    this.version(1).stores({
      games: '++id, gameId, gameType, status, createdAt, syncedAt'
    });
  }
}

export const db = new BingoDatabase();

export async function saveGame(game: BingoGame): Promise<void> {
  game.updatedAt = Date.now();
  await db.games.put(game);
}

export async function getGame(gameId: string): Promise<BingoGame | undefined> {
  return await db.games.where('gameId').equals(gameId).first();
}

export async function getActiveGame(): Promise<BingoGame | undefined> {
  return await db.games.where('status').equals('active').first();
}

export async function createNewGame(gameType: 75 | 90 = 75): Promise<BingoGame> {
  const game: BingoGame = {
    gameId: generateGameId(),
    gameType,
    drawnNumbers: [],
    currentNumber: null,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncedAt: null
  };
  
  await saveGame(game);
  return game;
}

export async function resetGame(gameId: string, gameType: 75 | 90 = 75): Promise<BingoGame> {
  const game: BingoGame = {
    gameId,
    gameType,
    drawnNumbers: [],
    currentNumber: null,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncedAt: null
  };
  
  await saveGame(game);
  return game;
}

function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function getAllGames(): Promise<BingoGame[]> {
  return await db.games.orderBy('createdAt').reverse().toArray();
}
