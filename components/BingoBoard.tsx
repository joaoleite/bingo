import React from 'react';
import { GameType } from '../types';
import { BINGO_75_COLUMNS, getNumberColor } from '../constants';

interface BingoBoardProps {
  gameType: GameType;
  drawnNumbers: number[];
  currentNumber: number | null;
}

const BingoBoard: React.FC<BingoBoardProps> = ({ gameType, drawnNumbers, currentNumber }) => {
  const isDrawn = (num: number) => drawnNumbers.includes(num);
  const isCurrent = (num: number) => num === currentNumber;

  const renderCell = (num: number) => {
    const active = isDrawn(num);
    const current = isCurrent(num);
    const baseColor = getNumberColor(num, gameType);
    
    // Updated with Dark Mode support (dark:...)
    let cellClasses = "flex items-center justify-center w-full aspect-square rounded-md text-base sm:text-xl md:text-2xl lg:text-3xl font-black transition-all duration-300 border shadow-sm leading-none";
    
    if (current) {
      return (
        <div key={num} className={`${cellClasses} ${baseColor} text-white scale-110 shadow-lg ring-4 ring-yellow-400 z-10 border-transparent animate-pulse`}>
          {num}
        </div>
      );
    }
    
    if (active) {
      return (
        <div key={num} className={`${cellClasses} ${baseColor} opacity-90 text-white border-transparent`}>
          {num}
        </div>
      );
    }

    // Empty cell: Light vs Dark mode colors
    return (
      <div key={num} className={`${cellClasses} bg-white text-gray-300 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700`}>
        {num}
      </div>
    );
  };

  if (gameType === 75) {
    return (
      <div className="flex flex-col h-full justify-between gap-2 w-full mx-auto p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800">
        {(Object.keys(BINGO_75_COLUMNS) as Array<keyof typeof BINGO_75_COLUMNS>).map((col) => (
          <div key={col} className="flex flex-row items-stretch gap-2 flex-1">
            {/* Letter Column */}
            <div className={`flex items-center justify-center w-12 sm:w-16 md:w-20 rounded-lg text-2xl sm:text-4xl font-black text-white shadow-md shrink-0
              ${col === 'B' ? 'bg-red-600' : 
                col === 'I' ? 'bg-blue-600' :
                col === 'N' ? 'bg-green-600' :
                col === 'G' ? 'bg-amber-500' : 
                'bg-purple-600'
              }`}>
              {col}
            </div>
            
            {/* Numbers Grid */}
            <div className="grid grid-cols-15 gap-1 sm:gap-2 flex-1 h-full items-center">
              {Array.from(
                { length: BINGO_75_COLUMNS[col].max - BINGO_75_COLUMNS[col].min + 1 },
                (_, i) => i + BINGO_75_COLUMNS[col].min
              ).map((num) => (
                <div key={num} className="w-full">
                  {renderCell(num)}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <style>{`
          .grid-cols-15 {
            display: grid;
            grid-template-columns: repeat(15, minmax(0, 1fr));
          }
          /* On very small mobile screens, break into 2 rows if needed, or scroll */
          @media (max-width: 640px) {
            .grid-cols-15 {
              grid-template-columns: repeat(8, minmax(0, 1fr));
            }
          }
        `}</style>
      </div>
    );
  }

  // 90 Ball Layout
  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 h-full">
      <div className="grid grid-cols-10 gap-2 sm:gap-3 h-full content-center">
        {Array.from({ length: 90 }, (_, i) => i + 1).map(renderCell)}
      </div>
    </div>
  );
};

export default BingoBoard;