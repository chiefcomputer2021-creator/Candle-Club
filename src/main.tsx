import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme, getTheme, watchDeviceTheme } from './lib/theme';
import './styles.css';

applyTheme(getTheme());
watchDeviceTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
