export const BINGO_75_COLUMNS = {
  B: { min: 1, max: 15 },
  I: { min: 16, max: 30 },
  N: { min: 31, max: 45 },
  G: { min: 46, max: 60 },
  O: { min: 61, max: 75 },
};

export const COLORS = {
  B: 'bg-red-600',
  I: 'bg-blue-600',
  N: 'bg-green-600',
  G: 'bg-amber-500',
  O: 'bg-purple-600',
};

// Helper to get color based on number
export const getNumberColor = (num: number, gameType: number = 75): string => {
  if (gameType === 90) return 'bg-indigo-600'; // Standard color for 90 ball
  
  if (num <= 15) return COLORS.B;
  if (num <= 30) return COLORS.I;
  if (num <= 45) return COLORS.N;
  if (num <= 60) return COLORS.G;
  return COLORS.O;
};

export const getLetterForNumber = (num: number): string => {
  if (num <= 15) return 'B';
  if (num <= 30) return 'I';
  if (num <= 45) return 'N';
  if (num <= 60) return 'G';
  return 'O';
};