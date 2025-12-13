export type GameType = 75 | 90;

export interface GameState {
  roomCode: string;
  gameType: GameType;
  drawnNumbers: number[];
  currentNumber: number | null;
  timestamp: number;
}

export interface BroadcastMessage {
  type: 'UPDATE_STATE' | 'RESET' | 'PING';
  payload?: GameState;
}

export enum BingoColumn {
  B = 'B',
  I = 'I',
  N = 'N',
  G = 'G',
  O = 'O'
}

export const ADMIN_PASSWORD = "admin"; // Simple basic auth simulation