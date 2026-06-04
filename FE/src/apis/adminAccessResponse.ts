type AdminAccessResponse = {
    ok: true;
    data: {
        is_staff: boolean;
    };
};

export const hasAdminAccess = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;

    const response = value as Partial<AdminAccessResponse>;

    return (
        response.ok === true &&
        !!response.data &&
        response.data.is_staff === true
    );
};
