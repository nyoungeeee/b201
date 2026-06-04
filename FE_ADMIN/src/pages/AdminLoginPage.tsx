import { buildKakaoAuthorizeUrl } from '../utils/kakaoAuth';

const AdminLoginPage = () => {
    const handleLogin = () => {
        window.location.assign(buildKakaoAuthorizeUrl('/'));
    };

    return (
        <div className="app-shell">
            <div className="mobile-frame admin-frame">
                <main className="admin-login">
                    <section className="admin-login__panel">
                        <h1>ADMIN - B201</h1>
                        <p>관리자 계정으로 로그인해 주세요.</p>
                        <button type="button" onClick={handleLogin}>
                            <span aria-hidden="true" />
                            카카오 로그인
                        </button>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default AdminLoginPage;
