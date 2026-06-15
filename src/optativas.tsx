import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import OptativasApp from './OptativasApp';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OptativasApp />
  </StrictMode>,
);
