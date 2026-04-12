export type GameType = 75 | 90;

export function getNumbersForGameType(gameType: GameType): number[] {
  return Array.from({ length: gameType }, (_, i) => i + 1);
}

export function getRandomNumber(drawnNumbers: number[], gameType: GameType): number {
  const availableNumbers = getNumbersForGameType(gameType).filter(
    n => !drawnNumbers.includes(n)
  );
  
  if (availableNumbers.length === 0) {
    throw new Error('Todos os números já foram sorteados!');
  }
  
  const randomIndex = Math.floor(Math.random() * availableNumbers.length);
  return availableNumbers[randomIndex];
}

export function getLetterForNumber(number: number, gameType: GameType): string {
  if (gameType === 75) {
    if (number >= 1 && number <= 15) return 'B';
    if (number >= 16 && number <= 30) return 'I';
    if (number >= 31 && number <= 45) return 'N';
    if (number >= 46 && number <= 60) return 'G';
    if (number >= 61 && number <= 75) return 'O';
  } else if (gameType === 90) {
    // Traditional Italian bingo - 90 balls, 3 rows of 9
    if (number >= 1 && number <= 30) return '1';
    if (number >= 31 && number <= 60) return '2';
    if (number >= 61 && number <= 90) return '3';
  }
  return '';
}

export function formatNumber(number: number, gameType: GameType): string {
  if (gameType === 75) {
    return String(number).padStart(2, '0');
  }
  return String(number);
}

export function getRemainingNumbers(drawnNumbers: number[], gameType: GameType): number {
  return gameType - drawnNumbers.length;
}

export function isGameComplete(drawnNumbers: number[], gameType: GameType): boolean {
  return drawnNumbers.length >= gameType;
}
