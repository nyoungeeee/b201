import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MyInfoPage from '../pages/MyInfoPage';
import NicknameEditPage from '../pages/NicknameEditPage';
import ReservationStatusPage from '../pages/ReservationStatusPage';

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ReservationStatusPage />} />
                <Route path="/my" element={<MyInfoPage />} />
                <Route path="/my/nickname" element={<NicknameEditPage />} />

            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;