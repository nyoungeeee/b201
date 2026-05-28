import type { TeamMember } from '../../types/team';
import TeamRoleBadge from './TeamRoleBadge';

interface TeamLeaderOptionCardProps {
    member: TeamMember;
    isSelected?: boolean;
    onSelect: (memberId: number) => void;
}

const getMemberCardClassName = (isSelected: boolean) =>
    [
        'card-row',
        'card-row--button',
        'card-row--interactive',
        'team-leader-change-page__member-card',
        isSelected &&
            'card-row--selected',
        isSelected &&
            'team-leader-change-page__member-card--selected',
    ]
        .filter(Boolean)
        .join(' ');

const TeamLeaderOptionCard = ({
    member,
    isSelected = false,
    onSelect,
}: TeamLeaderOptionCardProps) => {
    return (
        <button
            type="button"
            className={getMemberCardClassName(isSelected)}
            onClick={() => onSelect(member.id)}
        >
            <span className="card-row__title team-leader-change-page__nickname">
                {member.nickname}
            </span>

            <span className="card-row__right team-leader-change-page__right">
                <TeamRoleBadge role={member.role} />

                <span
                    className="team-leader-change-page__radio"
                    aria-hidden="true"
                >
                    {isSelected && (
                        <span className="team-leader-change-page__radio-dot" />
                    )}
                </span>
            </span>
        </button>
    );
};

export default TeamLeaderOptionCard;
