import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { signinWithKakao } from '../apis/authApi';
import { saveAuthSession } from '../utils/authStorage';
import { verifyKakaoAuthState } from '../utils/kakaoAuth';

const AdminKakaoCallbackPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;
        handledRef.current = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error || !code || !verifyKakaoAuthState(state)) {
            navigate('/', { replace: true });
            return;
        }

        const signin = async () => {
            try {
                saveAuthSession(await signinWithKakao(code));
            } catch (signinError) {
                console.error('Admin Kakao signin failed:', signinError);
            } finally {
                navigate('/', { replace: true });
            }
        };

        void signin();
    }, [navigate, searchParams]);

    return (
        <div className="app-shell">
            <div className="mobile-frame admin-frame">
                <main className="admin-login">
                    <section className="admin-loading-state">
                        <div
                            className="admin-loading-state__spinner"
                            aria-hidden="true"
                        />
                        <p>관리자 로그인 확인 중...</p>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default AdminKakaoCallbackPage;
