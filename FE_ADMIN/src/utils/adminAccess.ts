export type AdminAccessState =
    | 'signed-out'
    | 'checking'
    | 'allowed'
    | 'forbidden';

export const resolveAdminAccessState = (
    accessToken: string | null,
    isAllowed: boolean | null,
): AdminAccessState => {
    if (!accessToken) return 'signed-out';
    if (isAllowed === null) return 'checking';

    return isAllowed ? 'allowed' : 'forbidden';
};
