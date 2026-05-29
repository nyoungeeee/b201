import { useNavigate } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <MobilePageLayout header={<PageHeader />}>
            <main className="not-found-page">
                <section className="not-found-page__content">
                    <p className="not-found-page__code">404</p>
                    <h1>없는 페이지 입니다</h1>
                    <button
                        type="button"
                        className="not-found-page__button"
                        onClick={() => navigate('/')}
                    >
                        홈으로 이동
                    </button>
                </section>
            </main>
        </MobilePageLayout>
    );
};

export default NotFoundPage;
