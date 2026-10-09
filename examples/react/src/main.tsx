import '@esersahiner/player-theme/tokens.css';
import '@esersahiner/player-theme/fonts.css';
import '../../vanilla/src/demo.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
