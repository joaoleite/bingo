import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Admin from './pages/Admin';
import Display from './pages/Display';
import { GameProvider } from './context/GameContext';

const App: React.FC = () => {
  return (
    <Router>
      <GameProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/display" element={<Display />} />
        </Routes>
      </GameProvider>
    </Router>
  );
};

export default App;