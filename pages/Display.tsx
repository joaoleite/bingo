import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import BingoBoard from '../components/BingoBoard';
import { Volume2, VolumeX, Maximize, Minimize, Moon, Sun, Settings, Play } from 'lucide-react';
import { getNumberColor, getLetterForNumber } from '../constants';

const Display: React.FC = () => {
  const { roomCode, gameType, drawnNumbers, currentNumber } = useGame();
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [showSettings, setShowSettings] = useState(false);
  
  // Audio State
  const [hasInteracted, setHasInteracted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => localStorage.getItem('bingoVoice') || '');
  
  const lastAnnouncedRef = useRef<number | null>(null);

  // Theme Management
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Load Voices
  useEffect(() => {
    const loadVoices = () => {
      // Some browsers return empty array immediately, needs retry or event
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        
        // Auto-select a Portuguese voice if none selected and one exists
        if (!selectedVoiceURI) {
          const ptVoice = available.find(v => v.lang.includes('pt-BR')) || available.find(v => v.lang.includes('pt'));
          if (ptVoice) {
            setSelectedVoiceURI(ptVoice.voiceURI);
            localStorage.setItem('bingoVoice', ptVoice.voiceURI);
          }
        }
      }
    };

    loadVoices();
    
    // Chrome fires this async
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceURI]);

  // Handle Voice Selection
  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value;
    setSelectedVoiceURI(uri);
    localStorage.setItem('bingoVoice', uri);
  };

  const testVoice = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance("Teste de som. Coluna B, número 10.");
    utterance.lang = 'pt-BR';
    
    if (selectedVoiceURI) {
      const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (voice) utterance.voice = voice;
    }
    
    synth.speak(utterance);
  };

  // Wake Lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err: any) {
        // Suppress errors about permissions policy or not allowed, as they are common in iframes
        // We only warn if it's an unexpected error
        if (err.name !== 'NotAllowedError' && !err.message?.includes('policy')) {
             console.warn("Wake Lock warning:", err);
        }
      }
    };
    
    if (hasInteracted) {
        requestWakeLock();
    }
    
    const handleVisibility = () => {
       if (document.visibilityState === 'visible' && hasInteracted) requestWakeLock();
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { 
        document.removeEventListener('visibilitychange', handleVisibility);
        if (wakeLock) wakeLock.release().catch(() => {}); 
    };
  }, [hasInteracted]);

  // Text-to-Speech Logic
  useEffect(() => {
    // Only speak if user has interacted (browser policy) and not muted
    if (hasInteracted && currentNumber && currentNumber !== lastAnnouncedRef.current && !isMuted) {
      lastAnnouncedRef.current = currentNumber;
      
      const synth = window.speechSynthesis;
      synth.cancel(); // Stop any previous speech

      let text = `${currentNumber}`;
      
      if (gameType === 75) {
        const letter = getLetterForNumber(currentNumber);
        // Improved Phrasing for PT-BR
        text = `Coluna ${letter}, número ${currentNumber}. Repetindo, ${letter}, ${currentNumber}.`;
      } else {
        text = `Número ${currentNumber}.`;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; 
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'pt-BR'; // Explicit fallback

      // Use selected voice object if found
      if (selectedVoiceURI && voices.length > 0) {
        const voice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (voice) utterance.voice = voice;
      }

      synth.speak(utterance);
    }
  }, [currentNumber, gameType, isMuted, selectedVoiceURI, voices, hasInteracted]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  const handleStart = () => {
    setHasInteracted(true);
    // Try to play a silent sound or just speak 'Ready' to unlock audio context on iOS/Chrome
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance("Conectado.");
    utterance.lang = 'pt-BR';
    utterance.volume = 0.5;
    synth.speak(utterance);
  };

  const ballColor = currentNumber ? getNumberColor(currentNumber, gameType) : 'bg-gray-200 dark:bg-gray-700';

  if (!hasInteracted) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 dark:border-gray-800 animate-drop">
           <div className="h-20 w-20 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-6">
             <Volume2 size={40} />
           </div>
           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ativar Som</h1>
           <p className="text-gray-500 dark:text-gray-400 mb-8">
             Para que o bingo seja "cantado" automaticamente, o navegador precisa da sua permissão.
           </p>
           <button 
             onClick={handleStart}
             className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
           >
             <Play size={24} fill="currentColor" />
             Entrar e Ativar Áudio
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">Configurações de Áudio</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">✕</button>
            </div>
            
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Voz do Locutor</label>
            <select 
              value={selectedVoiceURI} 
              onChange={handleVoiceChange}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {voices.length === 0 && <option value="">Carregando vozes...</option>}
              {voices.map(voice => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>

            <button
              onClick={testVoice}
              className="w-full py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <Volume2 size={18} /> Testar Voz Agora
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              A voz escolhida é salva neste navegador.
            </p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
         <button 
          onClick={() => setShowSettings(true)}
          className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-md text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-gray-700"
          title="Configurações de Voz"
        >
          <Settings size={20} />
        </button>
         <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-md text-gray-700 dark:text-yellow-400 transition-all border border-gray-200 dark:border-gray-700"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
         <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`p-3 backdrop-blur-md rounded-full shadow-md transition-all border border-gray-200 dark:border-gray-700 ${isMuted ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700'}`}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <button 
          onClick={toggleFullscreen}
          className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full hover:bg-white dark:hover:bg-gray-700 shadow-md text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-gray-700"
        >
          {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
        </button>
      </div>
      
      <div className="absolute top-4 left-4 z-50 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full text-sm font-bold text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700">
        Sala: {roomCode}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-full p-4 gap-4">
        {/* Left Side: BIG NUMBER & HISTORY */}
        <div className="lg:w-1/3 flex flex-col gap-4">
          
          {/* Active Ball Container */}
          <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-lg flex items-center justify-center relative overflow-hidden transition-colors duration-300">
            {/* Background decoration matching ball color */}
             <div className={`absolute top-0 left-0 w-full h-full opacity-10 transition-colors duration-700 ${ballColor}`}></div>

            {currentNumber ? (
              <div key={currentNumber} className="relative animate-drop">
                <div className={`flex flex-col items-center justify-center h-72 w-72 lg:h-96 lg:w-96 rounded-full border-8 border-white dark:border-gray-800 shadow-2xl transition-colors duration-500 ${ballColor}`}>
                   {gameType === 75 && (
                      <span className="text-6xl font-black text-white/80 mb-[-1rem] drop-shadow-md">
                        {getLetterForNumber(currentNumber)}
                      </span>
                   )}
                  <span className="text-[10rem] lg:text-[12rem] leading-none font-black text-white drop-shadow-md">
                    {currentNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 w-64 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-700">
                <span className="text-2xl font-bold text-gray-400 dark:text-gray-600 animate-pulse">Aguardando...</span>
              </div>
            )}
          </div>

          {/* History Strip */}
          <div className="h-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md p-3 flex flex-col justify-center transition-colors duration-300">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">Histórico Recente</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
              {[...drawnNumbers].reverse().slice(1, 15).map((n, i) => (
                <div key={i} className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-lg font-bold text-white shadow-sm transition-colors ${getNumberColor(n, gameType)} opacity-80`}>
                  {n}
                </div>
              ))}
              {drawnNumbers.length <= 1 && <span className="text-gray-400 dark:text-gray-600 text-sm italic pl-2">O jogo começou...</span>}
            </div>
          </div>

        </div>

        {/* Right Side: BOARD */}
        <div className="lg:w-2/3 h-full min-h-0">
           <BingoBoard gameType={gameType} drawnNumbers={drawnNumbers} currentNumber={currentNumber} />
        </div>
      </div>
    </div>
  );
};

export default Display;