import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './assets/scss/App.scss';
import App from './gate.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
