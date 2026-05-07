import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MyInfoDetailPage from '../pages/MyInfoDetailPage';
import MyInfoPage from '../pages/MyInfoPage';
import NicknameEditPage from '../pages/NicknameEditPage';
import PolicyPage from '../pages/PolicyPage';
import ReservationStatusPage from '../pages/ReservationStatusPage';
import WithdrawPage from '../pages/WithdrawPage';

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ReservationStatusPage />} />
                <Route path="/my" element={<MyInfoPage />} />
                <Route path="/my/nickname" element={<NicknameEditPage />} />
                <Route path="/my/detail" element={<MyInfoDetailPage />} />
                <Route path="/policy/:type" element={<PolicyPage />} />
                <Route path="/my/withdraw" element={<WithdrawPage />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;