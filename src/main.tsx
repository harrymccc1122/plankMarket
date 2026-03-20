import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function bootstrap() {
  let walletConnectProjectId = '';
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      walletConnectProjectId = data.walletConnectProjectId ?? '';
    }
  } catch { /* use empty fallback */ }

  (window as any).__WALLETCONNECT_PROJECT_ID__ = walletConnectProjectId;

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
