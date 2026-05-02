import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRightIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';

const MyInfoPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        const message = location.state?.toastMessage;

        if (!message) return;

        setToastMessage(message);

        const timer = window.setTimeout(() => {
            setToastMessage(null);

            navigate(location.pathname, {
                replace: true,
                state: null,
            });
        }, 2000);

        return () => window.clearTimeout(timer);
    }, [location.state, navigate, location.pathname]);

    return (
        <MobilePageLayout>
            <PageHeader isLoggedIn={true} />

            <main className="my-info-page">
                <section className="my-info-page__profile">
                    <p className="my-info-page__label">
                        안녕하세요, 무엇을 찾으시나요?
                    </p>
                    <h1 className="my-info-page__nickname">
                        닉네임은여덟글자
                        <span className="my-info-page__nickname-suffix">
                            {' '}
                            님
                        </span>
                    </h1>
                </section>

                <div className="my-info-page__divider" />

                <section className="my-info-menu">
                    <button
                        type="button"
                        className="my-info-menu__item"
                        onClick={() => navigate('/my/nickname')}
                    >
                        <span>닉네임 변경</span>
                        <span className="my-info-menu__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="my-info-menu__item"
                        onClick={() => navigate('/my/team')}
                    >
                        <span>내 팀 확인</span>
                        <span className="my-info-menu__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>
                </section>
            </main>

            {toastMessage && (
                <div className="toast">
                    {toastMessage}
                </div>
            )}
        </MobilePageLayout>
    );
};

export default MyInfoPage;