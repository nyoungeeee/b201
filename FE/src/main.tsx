import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';

import { QueryProvider } from './providers/QueryProvider';
import AppRouter from './router/AppRouter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  </StrictMode>,
)
