import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./styles/button.css";
import "./styles/calendar.css";
import "./styles/globals.css";
import "./styles/layout.css";
import './styles/myInfo.css';
import "./styles/sideModal.css";
import "./styles/timeline.css";
import "./styles/toast.css";

import { QueryProvider } from './providers/QueryProvider';
import AppRouter from './router/AppRouter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AppRouter />
    </QueryProvider>
  </StrictMode>,
)
