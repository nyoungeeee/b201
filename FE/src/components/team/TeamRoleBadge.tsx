import { TEAM_ROLE_LABEL } from '../../domains/team/constants';
import { TEAM_ROLE } from '../../types/team';
import type { TeamRole } from '../../types/team';

interface TeamRoleBadgeProps {
    role: TeamRole;
}

const getRoleBadgeClassName = (role: TeamRole) =>
    [
        'role-badge',
        role === TEAM_ROLE.leader
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
