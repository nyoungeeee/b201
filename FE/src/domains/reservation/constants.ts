import type {
    ReservationSort,
    ReservationState,
    ReservationStateFilter,
    ReservationTeamFilter,
} from './types';

export const RESERVATION_COMMON_TEXT = {
    all: '전체',
    mine: '내 예약',
    personalPractice: '개인 연습',
    apply: '예약 신청하기',
    pending: '신청중',
} as const;

export const RESERVATION_STATUS_TEXT = {
    scopeToggleAriaLabel: '내 예약만 보기',
    timelineLoading: '예약 현황을 불러오고 있어요...',
    timelineError: (message: string) => `에러가 발생했습니다: ${message}`,
    timelineNoData: '데이터가 없습니다.',
    timelineMineEmpty: '선택한 날짜에 내 예약이 없어요.',
    omittedHoursAriaLabel: (hours: number) => `${hours}시간 생략`,
} as const;

export const CALENDAR_TEXT = {
    previousMonthAriaLabel: '이전 달',
    nextMonthAriaLabel: '다음 달',
    holiday: '휴무',
    holidayAriaLabel: (date: number) => `${date}일, 휴무`,
    unavailableHolidayAriaLabel: (month: number, date: number) =>
        `${month}월 ${date}일, 휴무, 선택 불가`,
} as const;

export const UPCOMING_RESERVATION_TEXT = {
    label: '다가오는 예약',
    today: '오늘',
    tomorrow: '내일',
} as const;

export const MY_RESERVATION_TEXT = {
    headerTitle: '내 예약 현황',
    listAriaLabel: '예약 목록',
    tabAriaLabel: '예약 구분',
    upcomingTab: '예정된 예약',
    pastTab: '지난 예약',
    filterAriaLabel: '예약 필터',
    stateFilter: '예약 상태',
    teamFilter: '팀 선택',
    sortFilter: '정렬 기준',
    loading: '내 예약 현황을 가져오고 있어요.',
    error: '예약 목록을 불러오지 못했어요.',
    empty: '표시할 예약이 없어요.',
    loadingMoreAriaLabel: '다음 예약을 불러오는 중',
    loadMoreError: '더 불러오지 못했어요. 다시 시도',
    listEnd: '모든 예약 내역을 확인했어요.',
    closeFilterAriaLabel: '필터 닫기',
    closeAriaLabel: '닫기',
    applyFilter: '적용하기',
} as const;

export const RESERVATION_STATE_FILTER_OPTIONS: Array<{
    label: string;
    value: ReservationStateFilter;
}> = [
    { label: RESERVATION_COMMON_TEXT.all, value: 'all' },
    { label: '승인대기', value: 'pending' },
    { label: '승인', value: 'approved' },
    { label: '거절', value: 'rejected' },
    { label: '취소', value: 'canceled' },
];

export const RESERVATION_SORT_OPTIONS: Array<{
    label: string;
    value: ReservationSort;
}> = [
    { label: '가까운 날짜 순', value: 'upcoming' },
    { label: '신청일 순', value: 'latest' },
];

export const RESERVATION_STATUS_QUERY: Record<
    ReservationState,
    'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'
> = {
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    canceled: 'CANCELED',
};

export const getReservationTeamFilterBaseOptions = (): Array<{
    label: string;
    value: ReservationTeamFilter;
}> => [
    { label: RESERVATION_COMMON_TEXT.all, value: 'all' },
    { label: RESERVATION_COMMON_TEXT.personalPractice, value: 'personal' },
];

export const RESERVATION_APPLY_TEXT = {
    headerTitle: '예약 신청',
    guideAriaLabel: '예약 안내',
    reviewGuideAriaLabel: '예약 신청 안내',
    stepListAriaLabel: '예약 조건',
    reopenTeamSettingsAriaLabel: '팀 설정 다시 열기',
    dateSelect: '날짜 선택',
    startTime: '시작 시간',
    startTimeSelectAriaLabel: '시작 시간 선택',
    endTime: '종료 시간',
    endTimeSelectAriaLabel: '종료 시간 선택',
    repeatSettings: '반복 설정',
    repeatChoice: '반복 여부',
    teamSettings: '팀 설정',
    noRepeat: '반복 없음',
    noRepeatBadge: '반복 안함',
    privatePractice: '개인 연습',
    privatePracticeCompact: '개인연습',
    teamPractice: '팀 연습',
    selectTime: '시간을 선택해 주세요.',
    loginRequired: '로그인이 필요한 기능입니다.',
    teamRequired: '예약할 팀을 선택해주세요.',
    missingReservationResponse: '예약 신청 응답에 예약 정보가 없습니다.',
    submitSuccess: '예약이 신청되었어요',
    submitError: '예약 신청에 실패했습니다.',
    repeatCheckError: '반복 예약 확인에 실패했습니다.',
    processing: '처리 중...',
    dateComplete: '날짜 선택 완료',
    startTimeComplete: '시작 시간 선택 완료',
    endTimeComplete: '종료 시간 선택 완료',
    repeatComplete: '반복 여부 선택 완료',
    teamComplete: '사용 팀 설정 완료',
    reviewNotices: [
        '예약 신청 후 관리자가 승인해야만 예약이 확정돼요.',
        '신청이 완료된 시간은 다른 사람이 신청할 수 없어요.',
        '예약 내용은 수정할 수 없으니, 변경이 필요하면 취소 후 다시 신청해 주세요.',
        '반복 예약 시 이미 예약된 날짜가 있다면, 해당 날짜는 제외하고 신청돼요.',
        '팀 사용으로 신청하면 해당 팀의 모든 멤버가 내 예약 현황 메뉴에서 해당 예약을 확인할 수 있어요.',
    ],
    repeatNoticeTitle: '반복 예약 알림',
    repeatNoticeDescription:
        '아래의 예약은 이미 존재하는 예약이 있어 제외하고 예약이 신청됩니다.',
    repeatNoticeExcludedDates: '[신청이 제외되는 날짜]',
    repeatNoticeConfirm: '신청이 제외되는 날짜를 모두 확인했어요.',
    cancel: '취소',
    submit: '신청',
} as const;

export const RESERVATION_PICKER_TEXT = {
    repeatSelectAriaLabel: '반복 여부 선택',
    repeatTitle: '반복 여부',
    teamSettings: '팀 설정',
    meridiemSelectAriaLabel: '오전 오후 선택',
} as const;

export const MY_RESERVATION_CARD_TEXT = {
    repeat: '반복 예약',
    conflictCount: (count: number) => `충돌 ${count}건`,
    applicant: (name: string) => `신청자 ${name}`,
    appliedAt: (date: string) => `신청일 ${date}`,
} as const;

export const ROOM_API_TEXT = {
    dayFetchError: (status: number) =>
        `일정 조회에 실패했습니다. (status: ${status})`,
    dayResponseError: '일정 응답 형식이 올바르지 않습니다.',
    monthFetchError: (status: number) =>
        `월 일정 조회에 실패했습니다. (status: ${status})`,
    monthResponseError: '월 일정 응답 형식이 올바르지 않습니다.',
    monthParamsRequired: 'year와 month는 필수입니다.',
} as const;

export const RESERVATION_API_TEXT = {
    repeatCheckError: (status: number) =>
        `반복 예약 확인에 실패했습니다. (status: ${status})`,
    createError: (status: number) =>
        `예약 신청에 실패했습니다. (status: ${status})`,
    createResponseError: '예약 신청 응답 형식이 올바르지 않습니다.',
    listError: (status: number) =>
        `예약 목록 조회에 실패했습니다. (status: ${status})`,
    listResponseError: '예약 목록 응답 형식이 올바르지 않습니다.',
    detailError: (status: number) =>
        `예약 상세 조회에 실패했습니다. (status: ${status})`,
    detailResponseError: '예약 상세 응답 형식이 올바르지 않습니다.',
    cancelError: (status: number) =>
        `예약 취소에 실패했습니다. (status: ${status})`,
} as const;
