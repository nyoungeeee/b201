import { useNavigate } from 'react-router-dom';

import { TEAM_EDIT_ACTIONS_TEXT } from '../../domains/team/constants';
import { TEAM_ROUTE } from '../../domains/team/routes';

interface TeamEditActionsProps {
    teamId: number;
    teamName: string;
    teamColor: string;
    teamColorId?: number | null;
}

const TeamEditActions = ({
    teamId,
    teamName,
    teamColor,
    teamColorId,
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
                    colorId: teamColorId,
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
