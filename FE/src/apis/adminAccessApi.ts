import { API_BASE_URL } from '../constants/env';
import { authFetch } from './authFetch';
import { hasAdminAccess } from './adminAccessResponse';

export const checkAdminAccess = async (): Promise<boolean> => {
    const response = await authFetch(`${API_BASE_URL}/admin/me`, {
        method: 'GET',
    });

    if (!response.ok) {
        return false;
    }

    const data: unknown = await response.json();

    return hasAdminAccess(data);
};
