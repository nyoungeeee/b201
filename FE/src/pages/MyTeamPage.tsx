import { useNavigate } from 'react-router-dom';

import { ChevronRightIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageHeader from '../components/layout/PageHeader';
import { MY_TEAM_TEXT } from '../domains/team/constants';
import { TEAM_ROUTE } from '../domains/team/routes';
import { useAuthSession } from '../hooks/useAuthSession';

const MyTeamPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthSession();

    const teams = user?.team ?? [];
    const hasTeams = teams.length > 0;

    const handleMoveTeamDetail = (teamId: number) => {
        navigate(TEAM_ROUTE.detail(teamId));
    };

    return (
        <MobilePageLayout>
            <PageHeader />

            <main className="my-team-page">
                <section className="my-team-page__intro">
                    <h1 className="my-team-page__title">
                        {MY_TEAM_TEXT.title}
                    </h1>

                    <p className="my-team-page__description">
                        {MY_TEAM_TEXT.description}
                    </p>
                </section>

                {hasTeams ? (
                    <ul className="my-team-page__list">
                        {teams.map((team) => (
                            <li
                                key={team.id}
                                className="my-team-page__item"
                            >
                                <button
                                    type="button"
                                    className="my-team-page__button"
                                    onClick={() =>
                                        handleMoveTeamDetail(team.id)
                                    }
                                >
                                    <span className="my-team-page__team-name">
                                        {team.name}
                                    </span>

                                    <ChevronRightIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <section className="my-team-page__empty">
                        <p className="my-team-page__empty-title">
                            {MY_TEAM_TEXT.emptyTitle}
                        </p>

                        <p className="my-team-page__empty-description">
                            {MY_TEAM_TEXT.emptyDescription}
                        </p>
                    </section>
                )}
            </main>
        </MobilePageLayout>
    );
};

export default MyTeamPage;
