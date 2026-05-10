import { MinusCircleIcon } from '../../components/common/icons';
import { TEAM_MEMBER_TEXT } from '../../domains/team/constants';
import { TEAM_ROLE } from '../../types/team';
import type { TeamRole } from '../../types/team';
import TeamRoleBadge from './TeamRoleBadge';

interface TeamMemberItemProps {
    nickname: string;
    role: TeamRole;
    isEditMode?: boolean;
    onRemove?: () => void;
}

const TeamMemberItem = ({
    nickname,
    role,
    isEditMode = false,
    onRemove,
}: TeamMemberItemProps) => {
    const isLeader = role === TEAM_ROLE.leader;

    return (
        <li className="team-member-item">
            <div className="card-row card-row--interactive team-member-item__content">
                <span className="card-row__title team-member-item__nickname">
                    {nickname}
                </span>

                <div className="card-row__right team-member-item__right">
                    <TeamRoleBadge role={role} />

                    {isEditMode &&
                        !isLeader && (
                            <button
                                type="button"
                                className="team-member-item__remove-button"
                                onClick={onRemove}
                                aria-label={
                                    TEAM_MEMBER_TEXT.removeAriaLabel
                                }
                            >
                                <MinusCircleIcon
                                    size={18}
                                />
                            </button>
                        )}
                </div>
            </div>
        </li>
    );
};

export default TeamMemberItem;
