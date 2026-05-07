import { useNavigate } from 'react-router-dom';

import { ChevronRightIcon } from "../components/common/icons";
import MobilePageLayout from "../components/layout/MobilePageLayout";
import PageSubHeader from "../components/layout/PageSubHeader";

const teams = [
    { id: 1, name: '[내가속한팀명1]' },
    { id: 2, name: '[내가속한팀명1]' },
];

const MyTeamPage = () => {
    const navigate = useNavigate();

    const hasTeams = teams.length > 0;

    const handleMoveTeamDetail = (teamId: number) => {
        navigate(`/team/${teamId}`);
    };

    return (
        <MobilePageLayout>
            <PageSubHeader />

            <main className="my-team-page">
                <section className="my-team-page__intro">
                    <h1 className="my-team-page__title">내 팀 관리</h1>

                    <p className="my-team-page__description">
                        내가 소속된 팀의 정보를 확인할 수 있어요.
                        <br />
                        정보를 확인할 팀을 선택해주세요.
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
                                    <span>{team.name}</span>

                                    <ChevronRightIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <section className="my-team-page__empty">
                        <p className="my-team-page__empty-title">
                            소속된 팀이 없어요
                        </p>

                        <p className="my-team-page__empty-description">
                            팀 초대를 받거나 새로운 팀을 생성해보세요.
                        </p>
                    </section>
                )}
            </main>
        </MobilePageLayout>
    );
};

export default MyTeamPage;