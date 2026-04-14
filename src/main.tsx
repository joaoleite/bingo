import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Display from './Display';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Check URL params for mode
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const isDisplayMode = mode === 'display';

ReactDOM.render(
  <React.StrictMode>
    {isDisplayMode ? <Display /> : <App />}
  </React.StrictMode>,
  root
);