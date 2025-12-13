import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Monitor, Dices } from 'lucide-react';
import { useGame } from '../context/GameContext';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { setRoomCode } = useGame();
  const [roomInput, setRoomInput] = useState('Sala-1');

  // Basic dark mode check to avoid flashing bright white on dark devices
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleJoin = (path: string) => {
    setRoomCode(roomInput);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="flex justify-center mb-6 text-indigo-600 dark:text-indigo-400">
          <Dices size={64} />
        </div>
        <h1 className="text-4xl font-extrabold text-center text-gray-900 dark:text-white mb-2">Bingo Mestre</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">Sistema Profissional de Bingo</p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nome da Sala</label>
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Digite o nome da sala..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleJoin('/admin')}
            className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 group shadow-sm hover:shadow-md"
          >
            <LayoutDashboard className="mb-3 text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" size={32} />
            <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Painel Admin</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Controlar o jogo</span>
          </button>

          <button
            onClick={() => handleJoin('/display')}
            className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl transition-all border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 group shadow-sm hover:shadow-md"
          >
            <Monitor className="mb-3 text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" size={32} />
            <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-green-700 dark:group-hover:text-green-300">Telão Público</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ver o sorteio</span>
          </button>
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Para jogar em rede local, conecte todos os dispositivos no mesmo Wi-Fi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;