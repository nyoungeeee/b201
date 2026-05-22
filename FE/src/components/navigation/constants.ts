export const SIDE_NAV_TEXT = {
    closeAriaLabel: '메뉴 닫기',
    closeButton: '×',
} as const;

export const GUEST_NAV_TEXT = {
    kakaoLogin: '카카오 계정으로 로그인하기',
} as const;

export const MEMBER_NAV_TEXT = {
    defaultNickname: '사용자',
    greeting: 'B201에 오신 것을 환영합니다.',
    nicknameSuffix: ' 님',
    logoutButton: '로그아웃',
    logoutToast: '다음에 또 만나요!',
} as const;

export const NAV_MENU = {
    reservationStatus: {
        label: '예약 현황',
        path: '/',
    },
    myReservation: {
        label: '내 예약 확인',
        path: '/my/reservations',
    },
    myInfo: {
        label: '내 정보 관리',
        path: '/my',
    },
    myTeam: {
        label: '내 팀 관리',
        path: '/team',
    },
} as const;

export const GUEST_NAV_MENU_ITEMS = [
    NAV_MENU.reservationStatus,
] as const;

export const MEMBER_NAV_MENU_ITEMS = [
    NAV_MENU.reservationStatus,
    NAV_MENU.myReservation,
    NAV_MENU.myInfo,
    NAV_MENU.myTeam,
] as const;
