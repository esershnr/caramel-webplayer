import '@esershnr/caramel-theme/tokens.css';
import '@esershnr/caramel-theme/fonts.css';
import '../../vanilla/src/demo.css';
import '@videojs/html/media/hls-video';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
