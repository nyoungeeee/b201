import { API_BASE_URL } from '../constants/env';
import { hasAdminAccess } from './adminAccessResponse';

export const checkAdminAccess = async (accessToken: string): Promise<boolean> => {
    const response = await fetch(`${API_BASE_URL}/admin/me`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        return false;
    }

    const data: unknown = await response.json();

    return hasAdminAccess(data);
};
