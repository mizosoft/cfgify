import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// react-flow base styles first so our overrides in styles.css win the cascade.
import '@xyflow/react/dist/style.css';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);