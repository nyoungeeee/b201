import { MinusCircleIcon } from '../../components/common/icons';

interface TeamMemberItemProps {
    nickname: string;
    role: 'LEADER' | 'MEMBER';
    isEditMode?: boolean;
    onRemove?: () => void;
}

const TEAM_MEMBER_TEXT = {
    leader: 'Leader',
    member: 'Member',
    removeAriaLabel: '멤버 제거',
} as const;

const getBadgeClassName = (isLeader: boolean) =>
    [
        'team-member-item__badge',

        isLeader
            ? 'team-member-item__badge--leader'
            : 'team-member-item__badge--member',
    ].join(' ');

const getRoleLabel = (isLeader: boolean) =>
    isLeader
        ? TEAM_MEMBER_TEXT.leader
        : TEAM_MEMBER_TEXT.member;

const TeamMemberItem = ({
    nickname,
    role,
    isEditMode = false,
    onRemove,
}: TeamMemberItemProps) => {
    const isLeader = role === 'LEADER';

    return (
        <li className="team-member-item">
            <div className="team-member-item__content">
                <span className="team-member-item__nickname">
                    {nickname}
                </span>

                <div className="team-member-item__right">
                    <span
                        className={getBadgeClassName(
                            isLeader,
                        )}
                    >
                        {getRoleLabel(isLeader)}
                    </span>

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