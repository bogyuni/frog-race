import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './assets/scss/App.scss';
import App from './gate.tsx';
import Race from './race';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/frog-selection/:step" element={<App />} />
        <Route path="/race" element={<Race />} />
      </Routes>
    </Router>
  </StrictMode>,
);
