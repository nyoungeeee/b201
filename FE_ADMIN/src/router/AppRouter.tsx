import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AdminKakaoCallbackPage from '../pages/AdminKakaoCallbackPage';
import AdminRoute from './AdminRoute';

const AppRouter = () => (
    <BrowserRouter>
        <Routes>
            <Route
                path="/auth/kakao/callback"
                element={<AdminKakaoCallbackPage />}
            />
            <Route path="*" element={<AdminRoute />} />
        </Routes>
    </BrowserRouter>
);

export default AppRouter;
