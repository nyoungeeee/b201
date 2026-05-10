import { useNavigate } from 'react-router-dom';

interface TeamEditActionsProps {
    teamId: number;
    teamName: string;
    teamColor: string;
}

const TEAM_EDIT_ACTIONS_TEXT = {
    changeColor: '대표 색상 변경하기',
    changeLeader: '리더 위임하기',
} as const;

const TEAM_ROUTE = {
    color: (teamId: number) => `/team/${teamId}/color`,
    changeLeader: (teamId: number) =>
        `/team/${teamId}/change-leader`,
} as const;

const TeamEditActions = ({
    teamId,
    teamName,
    teamColor,
}: TeamEditActionsProps) => {
    const navigate = useNavigate();

    const moveToPage = ({
        path,
        state,
    }: {
        path: string;
        state: object;
    }) => {
        navigate(path, { state });
    };

    const handleChangeColor = () => {
        moveToPage({
            path: TEAM_ROUTE.color(teamId),

            state: {
                team: {
                    id: teamId,
                    name: teamName,
                    color: teamColor,
                },
            },
        });
    };

    const handleChangeLeader = () => {
        moveToPage({
            path: TEAM_ROUTE.changeLeader(teamId),

            state: {
                team: {
                    id: teamId,
                },
            },
        });
    };

    return (
        <section className="team-edit-actions">
            <button
                type="button"
                className="team-edit-actions__button"
                onClick={handleChangeColor}
            >
                {TEAM_EDIT_ACTIONS_TEXT.changeColor}
            </button>

            <button
                type="button"
                className="team-edit-actions__button"
                onClick={handleChangeLeader}
            >
                {TEAM_EDIT_ACTIONS_TEXT.changeLeader}
            </button>
        </section>
    );
};

export default TeamEditActions;