import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import AppRouter from './router/AppRouter';
import './styles/index.css';
import { clearLegacyAuthTokens } from './utils/authStorage';

clearLegacyAuthTokens();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppRouter />
    </StrictMode>,
);
