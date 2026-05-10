import { TEAM_ROLE_LABEL } from '../../domains/team/constants';
import type { TeamRole } from '../../types/team';

interface TeamRoleBadgeProps {
    role: TeamRole;
}

const getRoleBadgeClassName = (role: TeamRole) =>
    [
        'role-badge',
        role === 'LEADER'
            ? 'role-badge--leader'
            : 'role-badge--member',
    ].join(' ');

const TeamRoleBadge = ({ role }: TeamRoleBadgeProps) => {
    return (
        <span className={getRoleBadgeClassName(role)}>
            {TEAM_ROLE_LABEL[role]}
        </span>
    );
};

export default TeamRoleBadge;
