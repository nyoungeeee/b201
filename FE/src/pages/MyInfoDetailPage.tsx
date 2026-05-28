import { useNavigate } from 'react-router-dom';

import { ChevronRightIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import { useRefreshAuthUser } from '../hooks/useRefreshAuthUser';
import { useAuthSession } from '../hooks/useAuthSession';

const MY_INFO_DETAIL_TEXT = {
    title: '내 정보 확인',
    description: (
        <>
            현재 로그인한 계정에 대한
            <br />
            SNS 연동 정보를 확인할 수 있어요.
        </>
    ),
    snsLabel: '연동 SNS',
    emailLabel: 'SNS 계정',
    provider: 'kakao',
    emptyEmail: '-',
} as const;

const MY_INFO_DETAIL_ROUTES = [
    {
        label: '서비스 이용약관',
        path: '/my/detail/terms',
    },
    {
        label: '개인정보 처리방침',
        path: '/my/detail/privacy',
    },
    {
        label: '회원탈퇴',
        path: '/my/detail/withdraw',
    },
] as const;

const MyInfoDetailPage = () => {
    const navigate = useNavigate();
    useRefreshAuthUser();
    const { user } = useAuthSession();

    return (
        <MobilePageLayout>
            <PageSubHeader />

            <main className="my-info-page">
                <section className="my-info-detail-page__profile">
                    <h1 className="my-info-page__title">
                        {MY_INFO_DETAIL_TEXT.title}
                    </h1>
                    <p className="my-info-page__label">
                        {MY_INFO_DETAIL_TEXT.description}
                    </p>
                </section>

                <div className="my-info-page__divider" />

                <section className="my-info-menu">
                    <div className="my-info-detail__row">
                        <span className="my-info-detail__label">
                            {MY_INFO_DETAIL_TEXT.snsLabel}
                        </span>

                        <div className="my-info-detail__value my-info-detail__value--sns">
                            <span
                                className="my-info-detail__sns-icon"
                                aria-hidden="true"
                            />
                            <span>{MY_INFO_DETAIL_TEXT.provider}</span>
                        </div>
                    </div>

                    <div className="my-info-detail__row">
                        <span className="my-info-detail__label">
                            {MY_INFO_DETAIL_TEXT.emailLabel}
                        </span>
                        <span className="my-info-detail__value">
                            {user?.email ?? MY_INFO_DETAIL_TEXT.emptyEmail}
                        </span>
                    </div>

                    {MY_INFO_DETAIL_ROUTES.map(({ label, path }) => (
                        <button
                            key={path}
                            type="button"
                            className="my-info-menu__item"
                            onClick={() => navigate(path)}
                        >
                            <span>{label}</span>
                            <span className="my-info-menu__arrow">
                                <ChevronRightIcon />
                            </span>
                        </button>
                    ))}
                </section>
            </main>
        </MobilePageLayout>
    );
};

export default MyInfoDetailPage;
