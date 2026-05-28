import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 30, // 30초 동안 fresh
            gcTime: 1000 * 60 * 5, // 5분 캐시 유지
            refetchOnWindowFocus: false,
        },
    },
});