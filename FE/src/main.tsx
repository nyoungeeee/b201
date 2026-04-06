import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./styles/button.css";
import "./styles/calendar.css";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/timeline.css";

import ReservationStatusPage from './pages/ReservationStatusPage';
import { QueryProvider } from './providers/QueryProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <ReservationStatusPage />
    </QueryProvider>
  </StrictMode>,
)
