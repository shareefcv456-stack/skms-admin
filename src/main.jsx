import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { UiProvider } from './lib/ui.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UiProvider>
      <App />
    </UiProvider>
  </StrictMode>,
);
