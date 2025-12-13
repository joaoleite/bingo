import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { ADMIN_PASSWORD } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Shuffle, RotateCcw, MonitorSmartphone, Settings, Lock, AlertTriangle, Moon, Sun } from 'lucide-react';
import BingoBoard from '../components/BingoBoard';
import { getNumberColor, getLetterForNumber } from '../constants';

const Admin: React.FC = () => {
  const { 
    roomCode, 
    gameType, 
    drawnNumbers, 
    currentNumber, 
    drawNumber, 
    resetGame, 
    setGameType,
    setIsAdmin
  } = useGame();

  const [isAuthenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isAuthenticated) setIsAdmin(true);
  }, [isAuthenticated, setIsAdmin]);

  // Theme Logic
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      alert("Senha incorreta (dica: admin)");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 transition-colors duration-300">
        <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-800">
          <div className="flex justify-center mb-4 text-indigo-600 dark:text-indigo-400">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">Acesso Administrativo</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 mb-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Digite a senha..."
            autoFocus
          />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const displayUrl = `${window.location.origin}/#/display?room=${roomCode}`;
  
  // Calculate dynamic color for current ball
  const ballColor = currentNumber ? getNumberColor(currentNumber, gameType) : 'bg-gray-200 dark:bg-gray-700';

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm shrink-0 z-20">
        <div className="max-w-full px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-200">Admin: <span className="text-indigo-600 dark:text-indigo-400">{roomCode}</span></h1>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 px-3 rounded-lg transition-colors flex items-center gap-2 font-medium text-gray-600 dark:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent dark:border-gray-700"
              title="Alternar Tema"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button 
              onClick={() => setShowQr(!showQr)}
              className={`p-2 px-4 rounded-lg transition-colors flex items-center gap-2 font-medium ${showQr ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
              title="Mostrar QR do Telão"
            >
              <MonitorSmartphone size={20} />
              <span className="hidden sm:inline">Abrir Telão</span>
            </button>
          </div>
        </div>
      </header>

      {/* QR Overlay */}
      {showQr && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowQr(false)}>
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl max-w-md w-full text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
            >
              ×
            </button>
            
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Visualização do Telão</h3>
            
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4 text-left">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  <strong>Importante:</strong> Abra o Telão em uma <strong>nova aba neste mesmo dispositivo</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-center mb-6 bg-white p-2 rounded-lg border border-gray-100 shadow-inner">
              <QRCodeSVG value={displayUrl} size={200} />
            </div>
            
            <a 
              href={displayUrl} 
              target="_blank" 
              rel="noreferrer"
              className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors mb-2"
            >
              Clique para Abrir Nova Aba
            </a>
          </div>
        </div>
      )}

      {/* Main Content - Flex Layout to fill height */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        
        {/* Left Column: Controls (Fixed width) */}
        <div className="lg:w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
          
          {/* Current Ball Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center shadow-md relative overflow-hidden shrink-0 transition-colors duration-300">
            <span className="text-gray-500 dark:text-gray-400 uppercase text-xs font-bold tracking-wider mb-2">Bola Atual</span>
            <div key={currentNumber} className={`h-40 w-40 rounded-full flex flex-col items-center justify-center shadow-lg transition-colors duration-500 ${ballColor} text-white animate-drop`}>
               {currentNumber && gameType === 75 && (
                  <span className="text-2xl font-bold opacity-80 mb-[-0.5rem]">{getLetterForNumber(currentNumber)}</span>
               )}
               <span className="text-7xl font-black tracking-tighter leading-none">
                {currentNumber || '--'}
               </span>
            </div>
            <div className="mt-4 text-gray-500 dark:text-gray-400 font-medium">
              Sorteados: <span className="text-gray-900 dark:text-white font-bold">{drawnNumbers.length}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <button
              onClick={drawNumber}
              disabled={drawnNumbers.length >= gameType}
              className="col-span-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-3 text-xl"
            >
              <Shuffle size={24} />
              SORTEAR
            </button>
            
            <button
              onClick={() => {
                if (window.confirm("Tem certeza que deseja reiniciar o jogo?")) resetGame();
              }}
              className="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <RotateCcw size={18} />
              Reiniciar
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm px-2">
              <Settings size={18} className="text-gray-400 mr-2" />
              <select 
                value={gameType} 
                onChange={(e) => {
                  if (window.confirm("Mudar o tipo de jogo irá reiniciar o tabuleiro. Continuar?")) {
                    setGameType(Number(e.target.value) as 75 | 90);
                  }
                }}
                className="bg-transparent text-gray-700 dark:text-gray-200 font-semibold outline-none cursor-pointer text-sm w-full py-3"
              >
                <option value={75}>75 Bolas</option>
                <option value={90}>90 Bolas</option>
              </select>
            </div>
          </div>

          {/* History */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex-1 min-h-[150px] flex flex-col transition-colors duration-300">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-3 border-b dark:border-gray-800 pb-2">Últimos Sorteados</h3>
            <div className="flex flex-wrap gap-2 content-start overflow-y-auto pr-1">
              {drawnNumbers.slice(-12).reverse().map((num, i) => (
                <div key={i} className={`h-10 w-10 flex items-center justify-center rounded-full text-white font-bold shadow-sm ${getNumberColor(num, gameType)}`}>
                  {num}
                </div>
              ))}
              {drawnNumbers.length === 0 && <span className="text-gray-400 dark:text-gray-600 italic text-sm">Sem histórico</span>}
            </div>
          </div>
        </div>

        {/* Board Column - Grows to fill space */}
        <div className="flex-1 min-h-0">
          <BingoBoard gameType={gameType} drawnNumbers={drawnNumbers} currentNumber={currentNumber} />
        </div>
      </div>
    </div>
  );
};

export default Admin;