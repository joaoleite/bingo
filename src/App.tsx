import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveGame, saveGame, createNewGame, resetGame, BingoGame } from './db/db';
import { getRandomNumber, getRemainingNumbers, isGameComplete } from './utils/bingo';
import { GameType } from './utils/bingo';

function App() {
  const [gameType] = useState<GameType>(75);
  const [manualNumber, setManualNumber] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  const currentGame = useLiveQuery(() => getActiveGame());

  // Create new game if none exists
  useEffect(() => {
    if (!currentGame) {
      createNewGame(gameType);
    }
  }, [currentGame, gameType]);

  const handleDrawRandom = async () => {
    if (!currentGame) return;
    
    try {
      const newNumber = getRandomNumber(currentGame.drawnNumbers, currentGame.gameType);
      const updatedGame: BingoGame = {
        ...currentGame,
        drawnNumbers: [...currentGame.drawnNumbers, newNumber],
        currentNumber: newNumber,
        status: isGameComplete([...currentGame.drawnNumbers, newNumber], currentGame.gameType) 
          ? 'completed' 
          : 'active'
      };
      await saveGame(updatedGame);
    } catch (error) {
      alert('Todos os números já foram sorteados!');
    }
  };

  const handleDrawManual = async () => {
    if (!currentGame || !manualNumber) return;
    
    const number = parseInt(manualNumber);
    if (isNaN(number)) return;
    if (number < 1 || number > currentGame.gameType) {
      alert(`Número deve estar entre 1 e ${currentGame.gameType}`);
      return;
    }
    if (currentGame.drawnNumbers.includes(number)) {
      alert('Este número já foi sorteado!');
      return;
    }

    const updatedGame: BingoGame = {
      ...currentGame,
      drawnNumbers: [...currentGame.drawnNumbers, number],
      currentNumber: number,
      status: isGameComplete([...currentGame.drawnNumbers, number], currentGame.gameType) 
        ? 'completed' 
        : 'active'
    };
    await saveGame(updatedGame);
    setManualNumber('');
  };

  const handleReset = async () => {
    if (!currentGame) return;
    if (!confirm('Tem certeza que deseja reiniciar o jogo? Todos os números serão limpos.')) return;
    
    await resetGame(currentGame.gameId, currentGame.gameType);
  };

  if (!currentGame) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  const remaining = getRemainingNumbers(currentGame.drawnNumbers, currentGame.gameType);

  return (
    <div className="min-h-screen p-4 text-white">
      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold text-primary">🎯 Bingoplay</h1>
        <p className="text-gray-400 text-sm">Sala: {currentGame.gameId}</p>
      </header>

      {/* Current Number Display */}
      <div className="flex justify-center mb-8">
        <div className="text-center">
          <p className="text-gray-400 mb-2">ÚLTIMO SORTEADO</p>
          {currentGame.currentNumber ? (
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="number-ball current bg-gradient-to-br from-primary to-pink-500 text-white"
            >
              {String(currentGame.currentNumber).padStart(2, '0')}
            </motion.div>
          ) : (
            <div className="number-ball current bg-gray-700 text-gray-500">
              --
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Manual Draw */}
        <div className="bg-darker rounded-xl p-4">
          <h3 className="font-bold mb-3 text-center">📝 Sortear Número</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="Digite o número"
              className="flex-1 bg-dark border border-gray-600 rounded-lg px-4 py-3 text-white text-center text-lg"
            />
            <button
              onClick={handleDrawManual}
              className="btn-primary"
            >
              Sortear
            </button>
          </div>
        </div>

        {/* Random Draw */}
        <button
          onClick={handleDrawRandom}
          disabled={remaining === 0}
          className="btn-primary text-lg py-4"
        >
          🎲 Sortear Aleatório
        </button>

        {/* Display Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="btn-secondary flex-1"
          >
            {showAll ? '🎯 Último' : '📋 Todos'}
          </button>
          <button
            onClick={handleReset}
            className="btn-danger flex-1"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-darker rounded-xl p-4 mb-4">
        <div className="flex justify-around text-center">
          <div>
            <p className="text-gray-400 text-sm">Restantes</p>
            <p className="text-2xl font-bold text-primary">{remaining}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Sorteados</p>
            <p className="text-2xl font-bold text-white">{currentGame.drawnNumbers.length}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm">Tipo</p>
            <p className="text-2xl font-bold text-white">{currentGame.gameType}</p>
          </div>
        </div>
      </div>

      {/* Drawn Numbers */}
      <div className="bg-darker rounded-xl p-4">
        <h3 className="font-bold mb-3 text-center">
          {showAll ? '📋 Todos os Números' : '🕐 Últimos Sorteados'}
        </h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {(showAll ? currentGame.drawnNumbers : currentGame.drawnNumbers.slice(-15)).map((num, index) => (
            <motion.div
              key={num}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.02 }}
              className="number-ball bg-gradient-to-br from-primary/80 to-primary text-white"
            >
              {String(num).padStart(2, '0')}
            </motion.div>
          ))}
          {currentGame.drawnNumbers.length === 0 && (
            <p className="text-gray-500 text-center w-full py-4">
              Nenhum número sorteado ainda
            </p>
          )}
        </div>
      </div>

      {/* Game Complete */}
      {currentGame.status === 'completed' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-center p-8 bg-darker rounded-2xl"
          >
            <p className="text-6xl mb-4">🎉</p>
            <h2 className="text-3xl font-bold text-primary mb-4">BINGO!</h2>
            <p className="text-gray-400 mb-6">Jogo completado!</p>
            <button
              onClick={handleReset}
              className="btn-primary"
            >
              Novo Jogo
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// Need to import motion
import { motion } from 'framer-motion';

export default App;
