import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveGame, saveGame, createNewGame, resetGame, BingoGame } from './db/db';
import { getRandomNumber, getRemainingNumbers, isGameComplete } from './utils/bingo';
import { GameType } from './utils/bingo';
import QRCode from 'qrcode';
import { io, Socket } from 'socket.io-client';

// Backend URL - configure based on environment
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://bingoplay.jota.qzz.io';

function App() {
  const [gameType] = useState<GameType>(75);
  const [manualNumber, setManualNumber] = useState('');
  const [showAll, setShowAll] = useState(false);
  
  // Online/Offline detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  
  const currentGame = useLiveQuery(() => getActiveGame());

  // Detect online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      connectSocket();
    };
    const handleOffline = () => {
      setIsOnline(false);
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      connectSocket();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (socket) socket.disconnect();
    };
  }, []);

  // Connect to socket.io
  const connectSocket = useCallback(() => {
    if (socket) return;
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      if (currentGame) {
        newSocket.emit('join-room', currentGame.gameId);
      }
    });

    newSocket.on('number-drawn', (data) => {
      // Display mode - receive number from admin
      if (currentGame) {
        saveGame({
          ...currentGame,
          drawnNumbers: data.drawnNumbers,
          currentNumber: data.number,
          status: data.status,
          syncedAt: Date.now()
        });
        setLastSynced(Date.now());
      }
    });

    newSocket.on('game-reset', () => {
      if (currentGame) {
        resetGame(currentGame.gameId, currentGame.gameType);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    setSocket(newSocket);
  }, [socket, currentGame]);

  // Generate QR Code
  useEffect(() => {
    if (showQR && currentGame) {
      const displayUrl = `${window.location.origin}?mode=display&room=${currentGame.gameId}`;
      QRCode.toDataURL(displayUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(setQrDataUrl);
    }
  }, [showQR, currentGame]);

  // Sync to server when online
  const syncToServer = useCallback(async (game: BingoGame) => {
    if (!socket || !isOnline || !game) return;
    
    socket.emit('draw-number', {
      roomId: game.gameId,
      number: game.currentNumber,
      drawnNumbers: game.drawnNumbers,
      currentNumber: game.currentNumber,
      status: game.status
    });
    
    setLastSynced(Date.now());
  }, [socket, isOnline]);

  // Create new game if none exists
  useEffect(() => {
    if (!currentGame) {
      createNewGame(gameType);
    }
  }, [currentGame, gameType]);

  // Join room when game is ready
  useEffect(() => {
    if (currentGame && socket && isOnline) {
      socket.emit('join-room', currentGame.gameId);
    }
  }, [currentGame, socket, isOnline]);

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
          : 'active',
        syncedAt: isOnline ? Date.now() : null
      };
      await saveGame(updatedGame);
      
      // Sync to display if online
      if (isOnline && socket) {
        await syncToServer(updatedGame);
      }
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
        : 'active',
      syncedAt: isOnline ? Date.now() : null
    };
    await saveGame(updatedGame);
    setManualNumber('');
    
    // Sync to display if online
    if (isOnline && socket) {
      await syncToServer(updatedGame);
    }
  };

  const handleReset = async () => {
    if (!currentGame) return;
    if (!confirm('Tem certeza que deseja reiniciar o jogo? Todos os números serão limpos.')) return;
    
    await resetGame(currentGame.gameId, currentGame.gameType);
    
    // Notify displays if online
    if (isOnline && socket) {
      socket.emit('reset-game', { roomId: currentGame.gameId });
    }
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
    <div className="min-h-screen p-4 text-white pb-24">
      {/* Header with online status */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">🎯 Bingoplay</h1>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </header>

      {/* Room & Sync Info */}
      <div className="bg-darker rounded-lg p-2 mb-4 flex justify-between items-center">
        <div className="text-sm">
          <span className="text-gray-400">Sala: </span>
          <span className="font-mono text-primary">{currentGame.gameId}</span>
        </div>
        {lastSynced && (
          <span className="text-xs text-gray-500">
            Sync: {new Date(lastSynced).toLocaleTimeString('pt-BR')}
          </span>
        )}
      </div>

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
            onClick={() => setShowQR(!showQR)}
            className="btn-secondary flex-1"
          >
            📡 QR Display
          </button>
          <button
            onClick={handleReset}
            className="btn-danger"
          >
            🔄
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-darker rounded-2xl p-6 max-w-sm w-full text-center"
          >
            <h3 className="text-xl font-bold mb-4">📡 Display Remoto</h3>
            <p className="text-gray-400 text-sm mb-4">
              Escaneie para abrir o display em outro dispositivo
            </p>
            
            {qrDataUrl ? (
              <img 
                src={qrDataUrl} 
                alt="QR Code" 
                className="mx-auto mb-4 rounded-lg"
              />
            ) : (
              <div className="bg-white p-4 rounded-lg mb-4">
                <p className="text-black">Gerando QR...</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mb-4 font-mono">
              ?mode=display&room={currentGame.gameId}
            </p>
            
            <button
              onClick={() => setShowQR(false)}
              className="btn-secondary w-full"
            >
              Fechar
            </button>
          </motion.div>
        </div>
      )}

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