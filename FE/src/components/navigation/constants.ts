export const SIDE_NAV_TEXT = {
    closeAriaLabel: '메뉴 닫기',
    closeButton: '×',
    coffeeLink: '개발자에게 커피사주기',
    coffeeQrTitle: '카카오페이 QR',
    coffeeQrDescription: '휴대폰 카메라로 QR 코드를 스캔해주세요.',
    coffeeQrCloseAriaLabel: '커피 후원 QR 닫기',
} as const;

export const GUEST_NAV_TEXT = {
    kakaoLogin: '카카오 계정으로 로그인하기',
} as const;

export const MEMBER_NAV_TEXT = {
    defaultNickname: '사용자',
    greeting: 'B201에 오신 것을 환영합니다.',
    nicknameSuffix: ' 님',
    adminButton: '합주실 관리',
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
        path: '/reservations',
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
