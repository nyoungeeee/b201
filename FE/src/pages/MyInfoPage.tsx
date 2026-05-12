import { useNavigate } from 'react-router-dom';

import { ChevronRightIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';

const MY_INFO_TEXT = {
    greeting: '안녕하세요, 무엇을 찾으시나요?',
    nicknameSuffix: '님',
} as const;

const MY_INFO_MENU = [
    {
        label: '닉네임 변경',
        path: '/my/nickname',
    },
    {
        label: '내 정보 확인',
        path: '/my/detail',
    },
] as const;

const USER = {
    nickname: '닉네임은여덟글자',
} as const;

const MyInfoPage = () => {
    const navigate = useNavigate();

    return (
        <MobilePageLayout>
            <PageHeader />

            <main className="my-info-page">
                <section className="my-info-page__profile">
                    <p className="my-info-page__label_accent">
                        {MY_INFO_TEXT.greeting}
                    </p>

                    <h1 className="my-info-page__nickname">
                        {USER.nickname}

                        <span className="my-info-page__nickname__suffix">
                            {' '}
                            {MY_INFO_TEXT.nicknameSuffix}
                        </span>
                    </h1>
                </section>

                <div className="my-info-page__divider" />

                <section className="my-info-menu">
                    {MY_INFO_MENU.map(({ label, path }) => (
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

export default MyInfoPage;
