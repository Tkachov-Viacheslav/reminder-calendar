import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initSentry } from './services/sentry';

initSentry();

// Автоматичне оновлення при розгортанні нової версії на Vercel (запобігає 404 для старих чанків)
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const hasReloaded = sessionStorage.getItem('vite_preload_reload');
  if (!hasReloaded) {
    sessionStorage.setItem('vite_preload_reload', 'true');
    window.location.reload();
  }
});

try {
  sessionStorage.removeItem('vite_preload_reload');
  sessionStorage.removeItem('chunk_retry');
} catch {}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

if (
  'serviceWorker' in navigator &&
  (import.meta.env.PROD || window.location.protocol === 'https:' || window.location.hostname === 'localhost')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
