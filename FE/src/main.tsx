import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import "./styles/button.css";
import "./styles/calendar.css";
import "./styles/globals.css";
import "./styles/layout.css";
import "./styles/timeline.css";

import ReservationStatusPage from './pages/ReservationStatusPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReservationStatusPage />
  </StrictMode>,
)
