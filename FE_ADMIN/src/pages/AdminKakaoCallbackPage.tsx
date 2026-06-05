import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminKakaoCallbackPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/', { replace: true });
    }, [navigate]);

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
