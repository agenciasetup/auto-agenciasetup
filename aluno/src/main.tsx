import { createRoot } from 'react-dom/client';
import './aluno.css';
import './extra.css';
import { App } from './App';

createRoot(document.getElementById('raiz')!).render(<App />);

// Instalar na tela inicial (PWA). No computador de desenvolvimento não registra, para não guardar versão velha.
if ('serviceWorker' in navigator && !/localhost$/.test(location.hostname)) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
