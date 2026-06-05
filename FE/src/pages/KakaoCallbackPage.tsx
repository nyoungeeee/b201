import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import BottomHero from '../components/branding/BottomHero';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';

const KAKAO_CALLBACK_TEXT = {
    loading: '로그인 중...',
    error: '카카오 로그인에 실패했어요. 다시 시도해주세요.',
} as const;

const KakaoCallbackPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate('/', {
            replace: true,
            state: {
                toastMessage: KAKAO_CALLBACK_TEXT.error,
            },
        });
    }, [navigate]);

    return (
        <MobilePageLayout header={<PageHeader />}>
            <main className="kakao-callback-page">
                <section className="kakao-callback-page__content">
                    <div
                        className="kakao-callback-page__spinner"
                        aria-hidden="true"
                    />

                    <p className="kakao-callback-page__message">
                        {KAKAO_CALLBACK_TEXT.loading}
                    </p>
                </section>

                <BottomHero />
            </main>
        </MobilePageLayout>
    );
};

export default KakaoCallbackPage;
