export const getAdminHomeUrl = (baseUrl: string): string =>
    baseUrl.replace(/\/+$/g, '');
