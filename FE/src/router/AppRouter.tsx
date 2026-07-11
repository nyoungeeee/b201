import { BrowserRouter, Route, Routes } from 'react-router-dom';

import RequireAuth from '../components/auth/RequireAuth';
import KakaoCallbackPage from '../pages/KakaoCallbackPage';
import MyInfoDetailPage from '../pages/MyInfoDetailPage';
import MyInfoExternalCalendarPage from '../pages/MyInfoExternalCalendarPage';
import MyInfoPage from '../pages/MyInfoPage';
import MyReservationDetailPage from '../pages/MyReservationDetailPage';
import MyReservationPage from '../pages/MyReservationPage';
import MyTeamDetailPage from '../pages/MyTeamDetailPage';
import MyTeamPage from '../pages/MyTeamPage';
import NicknameEditPage from '../pages/NicknameEditPage';
import NotFoundPage from '../pages/NotFoundPage';
import PolicyPage from '../pages/PolicyPage';
import ReservationApplyPage from '../pages/ReservationApplyPage';
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
                <Route path="/my/detail/:type" element={<PolicyPage />} />
                <Route element={<RequireAuth />}>
                    <Route path="/reservation/apply" element={<ReservationApplyPage />} />
                    <Route path="/my" element={<MyInfoPage />} />
                    <Route path="/reservations" element={<MyReservationPage />} />
                    <Route path="/reservations/:reservationId" element={<MyReservationDetailPage />} />
                    <Route path="/my/nickname" element={<NicknameEditPage />} />
                    <Route path="/my/detail" element={<MyInfoDetailPage />} />
                    <Route path="/my/external-calendar" element={<MyInfoExternalCalendarPage />} />
                    <Route path="/my/detail/withdraw" element={<WithdrawPage />} />
                    <Route path="/team" element={<MyTeamPage />} />
                    <Route path="/team/:id" element={<MyTeamDetailPage />} />
                    <Route path="/team/:id/color" element={<TeamColorChangePage />} />
                    <Route path="/team/:id/change-leader" element={<TeamLeaderChangePage />} />
                </Route>
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
