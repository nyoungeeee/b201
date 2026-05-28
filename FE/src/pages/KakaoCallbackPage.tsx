import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { signinWithKakao } from '../apis/authApi';
import BottomHero from '../components/branding/BottomHero';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';
import { saveAuthSession } from '../utils/authStorage';
import {
    takeKakaoAuthReturnTo,
    verifyKakaoAuthState,
} from '../utils/kakaoAuth';

const KAKAO_CALLBACK_TEXT = {
    loading: '로그인 중...',
    error: '카카오 로그인에 실패했어요. 다시 시도해주세요.',
} as const;

const getSigninSuccessToastMessage = (nickname: string | null) => {
    return `어서오세요. ${nickname ?? '사용자'}님`;
};

const KakaoCallbackPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const handledRef = useRef(false);

    useEffect(() => {
        if (handledRef.current) return;
        handledRef.current = true;

        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const returnTo = takeKakaoAuthReturnTo();

        if (error || !code || !verifyKakaoAuthState(state)) {
            navigate('/', {
                replace: true,
                state: {
                    toastMessage: KAKAO_CALLBACK_TEXT.error,
                },
            });
            return;
        }

        const signin = async () => {
            try {
                const signinResponse = await signinWithKakao(code);
                saveAuthSession(signinResponse);

                navigate(returnTo, {
                    replace: true,
                    state: {
                        toastMessage: getSigninSuccessToastMessage(
                            signinResponse.nickname,
                        ),
                    },
                });
            } catch (signinError) {
                console.error('Kakao signin failed:', signinError);

                navigate('/', {
                    replace: true,
                    state: {
                        toastMessage: KAKAO_CALLBACK_TEXT.error,
                    },
                });
            }
        };

        void signin();
    }, [navigate, searchParams]);

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
