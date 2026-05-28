const looksLikeJwt = (value: string) => value.split('.').length === 3;

export const getJwtUserId = (accessToken: string): number | undefined => {
    if (!looksLikeJwt(accessToken)) return undefined;

    try {
        const [, payload] = accessToken.split('.');
        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decodedPayload = atob(normalizedPayload);
        const data = JSON.parse(decodedPayload) as { user_id?: unknown };

        return typeof data.user_id === 'number' ? data.user_id : undefined;
    } catch {
        return undefined;
    }
};

export const resolveAdminAccessToken = (
    _envAccessTokenKey: string | undefined,
    storedAccessToken: string | null,
): string => {
    return storedAccessToken ?? '';
};
