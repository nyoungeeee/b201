import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';

import adminFavicon from '../assets/B201-admin-favicon.ico';
import favicon from '../assets/favicon.ico';
import AdminPage from '../pages/AdminPage';
import AdminRoute from './AdminRoute';
import MyInfoDetailPage from '../pages/MyInfoDetailPage';
import MyInfoPage from '../pages/MyInfoPage';
import MyReservationDetailPage from '../pages/MyReservationDetailPage';
import MyReservationPage from '../pages/MyReservationPage';
import MyTeamDetailPage from '../pages/MyTeamDetailPage';
import KakaoCallbackPage from '../pages/KakaoCallbackPage';
import MyTeamPage from '../pages/MyTeamPage';
import NicknameEditPage from '../pages/NicknameEditPage';
import PolicyPage from '../pages/PolicyPage';
import ReservationApplyPage from '../pages/ReservationApplyPage';
import ReservationStatusPage from '../pages/ReservationStatusPage';
import TeamColorChangePage from '../pages/TeamColorChangePage';
import TeamLeaderChangePage from '../pages/TeamLeaderChangePage';
import WithdrawPage from '../pages/WithdrawPage';

const AppDocumentMetadata = () => {
    const { pathname } = useLocation();
    const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

    useEffect(() => {
        document.title = isAdminRoute ? 'ADMIN - B201' : 'B201';

        const faviconLink = document.querySelector<HTMLLinkElement>(
            'link#app-favicon',
        );

        if (faviconLink) {
            faviconLink.href = isAdminRoute ? adminFavicon : favicon;
        }
    }, [isAdminRoute]);

    return null;
};

const AppRouter = () => {
    return (
        <BrowserRouter>
            <AppDocumentMetadata />
            <Routes>
                <Route path="/" element={<ReservationStatusPage />} />
                <Route path="/reservation/apply" element={<ReservationApplyPage />} />
                <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
                <Route path="/my" element={<MyInfoPage />} />
                <Route path="/reservations" element={<MyReservationPage />} />
                <Route path="/reservations/:reservationId" element={<MyReservationDetailPage />} />
                <Route path="/my/nickname" element={<NicknameEditPage />} />
                <Route path="/my/detail" element={<MyInfoDetailPage />} />
                <Route path="/my/detail/:type" element={<PolicyPage />} />
                <Route path="/my/detail/withdraw" element={<WithdrawPage />} />
                <Route path="/team" element={<MyTeamPage />} />
                <Route path="/team/:id" element={<MyTeamDetailPage />} />
                <Route path="/team/:id/color" element={<TeamColorChangePage />} />
                <Route path="/team/:id/change-leader" element={<TeamLeaderChangePage />} />
                <Route
                    path="/admin"
                    element={
                        <AdminRoute>
                            <AdminPage />
                        </AdminRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRouter;
