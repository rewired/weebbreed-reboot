import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProviders } from './providers/AppProviders.tsx';
import './styles/global.css';

const mount = document.getElementById('root');

if (mount) {
  const root = createRoot(mount);
  root.render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}
