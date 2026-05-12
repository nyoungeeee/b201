import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MyInfoDetailPage from '../pages/MyInfoDetailPage';
import MyInfoPage from '../pages/MyInfoPage';
import MyTeamDetailPage from '../pages/MyTeamDetailPage';
import KakaoCallbackPage from '../pages/KakaoCallbackPage';
import MyTeamPage from '../pages/MyTeamPage';
import NicknameEditPage from '../pages/NicknameEditPage';
import PolicyPage from '../pages/PolicyPage';
import ReservationStatusPage from '../pages/ReservationStatusPage';
import TeamColorChangePage from '../pages/TeamColorChangePage';
import TeamLeaderChangePage from '../pages/TeamLeaderChangePage';
import WithdrawPage from '../pages/WithdrawPage';

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ReservationStatusPage />} />
                <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
                <Route path="/my" element={<MyInfoPage />} />
                <Route path="/my/nickname" element={<NicknameEditPage />} />
                <Route path="/my/detail" element={<MyInfoDetailPage />} />
                <Route path="/my/detail/:type" element={<PolicyPage />} />
                <Route path="/my/detail/withdraw" element={<WithdrawPage />} />
                <Route path="/team" element={<MyTeamPage />} />
                <Route path="/team/:id" element={<MyTeamDetailPage />} />
                <Route path="/team/:id/color" element={<TeamColorChangePage />} />
                <Route path="/team/:id/change-leader" element={<TeamLeaderChangePage />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
