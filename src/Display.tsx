import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'https://bingoplay.jota.qzz.io';

interface GameState {
  drawnNumbers: number[];
  currentNumber: number | null;
  status: string;
}

function Display() {
  const [roomId, setRoomId] = useState<string>('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<GameState>({
    drawnNumbers: [],
    currentNumber: null,
    status: 'waiting'
  });
  
  // Get room from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setRoomId(room);
      connectToRoom(room);
    } else {
      setLoading(false);
    }
  }, []);

  const connectToRoom = (room: string) => {
    try {
      const socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        timeout: 10000
      });

      socket.on('connect', () => {
        setConnected(true);
        socket.emit('join-room', room);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });

      socket.on('connect_error', () => {
        setConnected(false);
      });

      socket.on('game-state', (data: GameState) => {
        setGameState(data);
        setLoading(false);
      });

      socket.on('number-drawn', (data: GameState) => {
        setGameState(data);
      });

      socket.on('game-reset', () => {
        setGameState({
          drawnNumbers: [],
          currentNumber: null,
          status: 'waiting'
        });
      });

      // Fallback to polling if no socket
      setTimeout(() => {
        if (loading) {
          pollServer(room);
        }
      }, 5000);
    } catch (e) {
      console.log('Socket connection failed, using polling');
      pollServer(room);
    }
  };

  const pollServer = async (room: string) => {
    try {
      const res = await fetch(`${SERVER_URL.replace(/\/$/, '')}/room/${room}`);
      const data = await res.json();
      if (data.exists) {
        setGameState({
          drawnNumbers: data.drawnNumbers || [],
          currentNumber: data.currentNumber,
          status: data.status
        });
      }
      setConnected(true);
    } catch (e) {
      setConnected(false);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-dark">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📺</div>
          <p className="text-xl">Conectando à sala...</p>
        </div>
      </div>
    );
  }

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-dark">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">📺</div>
          <h1 className="text-2xl font-bold text-primary mb-4">Display Remoto</h1>
          <p className="text-gray-400">Nenhuma sala especificada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 text-white bg-dark">
      {/* Header */}
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">📺 Bingo Display</h1>
        <div className="flex items-center justify-center gap-2">
          <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-lg">{connected ? 'Ao Vivo' : 'Offline'}</span>
        </div>
        <p className="text-gray-400 mt-2">Sala: {roomId}</p>
      </header>

      {/* Current Number - Big Display */}
      <div className="flex justify-center mb-12">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">ÚLTIMO NÚMERO</p>
          {gameState.currentNumber ? (
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="number-ball text-8xl w-48 h-48 flex items-center justify-center bg-gradient-to-br from-primary to-pink-500 text-white"
            >
              {String(gameState.currentNumber).padStart(2, '0')}
            </motion.div>
          ) : (
            <div className="number-ball text-8xl w-48 h-48 flex items-center justify-center bg-gray-700 text-gray-500">
              --
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-darker rounded-2xl p-6">
          <div className="flex justify-around text-center">
            <div>
              <p className="text-gray-400">Sorteados</p>
              <p className="text-4xl font-bold text-white">{gameState.drawnNumbers.length}</p>
            </div>
            <div>
              <p className="text-gray-400">Progresso</p>
              <p className="text-4xl font-bold text-primary">
                {Math.round((gameState.drawnNumbers.length / 75) * 100)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drawn Numbers */}
      {gameState.drawnNumbers.length > 0 && (
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-darker rounded-2xl p-4">
            <p className="text-gray-400 text-center mb-3">NÚMEROS SORTEADOS</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {gameState.drawnNumbers.map((num) => (
                <div key={num} className="number-ball bg-primary/80 text-white w-10 h-10 flex items-center justify-center">
                  {String(num).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Waiting message */}
      {gameState.drawnNumbers.length === 0 && (
        <div className="text-center mt-8">
          <p className="text-gray-500 text-xl animate-pulse">
            Aguardando início do jogo...
          </p>
        </div>
      )}
    </div>
  );
}

export default Display;