import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GameState, GameType, BroadcastMessage } from '../types';
import { broadcastService } from '../services/broadcastService';

interface GameContextType extends GameState {
  drawNumber: () => void;
  resetGame: () => void;
  setGameType: (type: GameType) => void;
  setRoomCode: (code: string) => void;
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = 'bingo_master_state';

const getInitialState = (): GameState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse stored state", e);
    }
  }
  return {
    roomCode: 'default',
    gameType: 75,
    drawnNumbers: [],
    currentNumber: null,
    timestamp: Date.now(),
  };
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GameState>(getInitialState());
  const [isAdmin, setIsAdmin] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Sync Logic
  useEffect(() => {
    const unsubscribe = broadcastService.subscribe((message: BroadcastMessage) => {
      if (message.type === 'UPDATE_STATE' && message.payload) {
        // Only update if the payload is newer or different
        // In a real socket app, we'd rely on server truth. 
        // Here, we trust the "Admin" broadcaster.
        setState(prev => {
          if (message.payload!.timestamp > prev.timestamp || message.payload!.drawnNumbers.length !== prev.drawnNumbers.length) {
            return message.payload!;
          }
          return prev;
        });
      } else if (message.type === 'RESET') {
        setState(prev => ({
          ...prev,
          drawnNumbers: [],
          currentNumber: null,
          timestamp: Date.now()
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const broadcastState = useCallback((newState: GameState) => {
    broadcastService.sendMessage({
      type: 'UPDATE_STATE',
      payload: newState
    });
  }, []);

  const drawNumber = useCallback(() => {
    if (!isAdmin) return;

    const max = state.gameType;
    const available = Array.from({ length: max }, (_, i) => i + 1)
      .filter(n => !state.drawnNumbers.includes(n));

    if (available.length === 0) return; // Game over

    const randomIndex = Math.floor(Math.random() * available.length);
    const nextNumber = available[randomIndex];

    const newState: GameState = {
      ...state,
      drawnNumbers: [...state.drawnNumbers, nextNumber],
      currentNumber: nextNumber,
      timestamp: Date.now()
    };

    setState(newState);
    broadcastState(newState);
  }, [state, isAdmin, broadcastState]);

  const resetGame = useCallback(() => {
    if (!isAdmin) return;
    const newState: GameState = {
      ...state,
      drawnNumbers: [],
      currentNumber: null,
      timestamp: Date.now()
    };
    setState(newState);
    broadcastService.sendMessage({ type: 'RESET' });
  }, [state, isAdmin]);

  const setGameType = useCallback((type: GameType) => {
     if (!isAdmin) return;
     const newState = { ...state, gameType: type, drawnNumbers: [], currentNumber: null, timestamp: Date.now() };
     setState(newState);
     broadcastState(newState);
  }, [state, isAdmin, broadcastState]);

  const setRoomCode = useCallback((code: string) => {
    setState(prev => ({ ...prev, roomCode: code }));
  }, []);

  return (
    <GameContext.Provider value={{ 
      ...state, 
      drawNumber, 
      resetGame, 
      setGameType, 
      setRoomCode,
      isAdmin,
      setIsAdmin 
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};