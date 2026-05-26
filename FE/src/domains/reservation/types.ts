export type ReservationState = 'pending' | 'approved' | 'rejected' | 'canceled';
export type ReservationKind = 'personal' | 'team';
export type ReservationTab = 'upcoming' | 'past';
export type ReservationSort = 'upcoming' | 'latest';
export type ReservationStateFilter = 'all' | ReservationState;
export type ReservationTeamFilter = 'all' | 'personal' | `team:${number}`;

export interface ReservationListViewState {
    activeTab: ReservationTab;
    sort: ReservationSort;
    stateFilter: ReservationStateFilter;
    teamFilter: ReservationTeamFilter;
    scrollTop?: number;
}

export interface MyReservation {
    id: number;
    title: string;
    applicant: string;
    appliedAt: string;
    startAt: string;
    endAt: string;
    state: ReservationState;
    kind: ReservationKind;
    isRepeat: boolean;
    canceledAt?: string;
    canceledBy?: string;
    conflictCount?: number;
    repeatEndAt?: string;
    color: string;
    colorRgb?: string;
}
