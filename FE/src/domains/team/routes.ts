export const TEAM_ROUTE = {
    list: '/team',
    detail: (teamId: number) => `/team/${teamId}`,
    color: (teamId: number) => `/team/${teamId}/color`,
    changeLeader: (teamId: number) =>
        `/team/${teamId}/change-leader`,
} as const;
