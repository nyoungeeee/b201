import type { TeamRole } from '../../types/team';

export const MY_TEAM_TEXT = {
    title: '내 팀 관리',
    description: (
        <>
            내가 소속된 팀의 정보를 확인할 수 있어요.
            <br />
            정보를 확인할 팀을 선택해주세요.
        </>
    ),
    emptyTitle: '소속된 팀이 없어요',
    emptyDescription: '팀 초대를 받거나 새로운 팀을 생성해보세요.',
} as const;

export const MY_TEAM_DETAIL_TEXT = {
    headerTitle: '팀 멤버',
    editButton: '편집',
    doneButton: '완료',
    removeSuccessToast: '팀 멤버가 제거되었어요.',
    addSuccessToast: '팀 멤버가 추가되었어요.',
} as const;

export const TEAM_COLOR_TEXT = {
    headerTitle: '팀 대표 색상 변경',
    sectionTitle: '색상 선택',
    description:
        '선택한 색상은 팀 예약과 팀 정보에 대표 색상으로 표시됩니다.',
    submitButton: '대표 색상 변경하기',
    toastMessage: '팀 대표 색상이 변경되었어요.',
    usedLabel: '사용 중',
    selectedLabel: '선택한 색상',
    currentLabel: '현재 팀 색상',
} as const;

export const TEAM_LEADER_CHANGE_TEXT = {
    headerTitle: '리더 위임',
    currentLeaderTitle: '현재 리더',
    selectLeaderTitle: '리더로 변경할 멤버 선택',
    submitButton: '리더 위임하기',
    toastMessage: '리더가 위임되었어요.',
    notices: [
        '권한을 위임하면 현재 리더는 일반 멤버로 변경돼요.',
        '각 팀의 리더는 1명만 존재할 수 있어요.',
        '리더 위임이 완료되면 현재 계정은 더 이상 팀을 관리할 수 없어요.',
    ],
} as const;

export const TEAM_EDIT_ACTIONS_TEXT = {
    changeColor: '대표 색상 변경하기',
    changeLeader: '리더 위임하기',
} as const;

export const TEAM_PROFILE_CARD_TEXT = {
    currentColorLabel: '현재 색상',
} as const;

export const TEAM_MEMBER_LIST_TEXT = {
    title: '팀 멤버',
    emptyMessage: '등록된 팀 멤버가 없어요.',
    addButton: '멤버 추가하기',
} as const;

export const TEAM_MEMBER_TEXT = {
    removeAriaLabel: '멤버 제거',
} as const;

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
    LEADER: 'Leader',
    MEMBER: 'Member',
};

export const ADD_MEMBER_MODAL_TEXT = {
    title: '팀 멤버 추가',
    description: (
        <>
            추가하려는 멤버의 닉네임을 입력해주세요.
            <span>
                추가한 팀원은 즉시 팀 멤버로 등록되고,
                <br />
                팀 예약 조회/신청/취소 권한이 부여됩니다.
            </span>
        </>
    ),
    cancelButton: '취소',
    confirmButton: '추가',
    clearAriaLabel: '입력값 지우기',
    placeholder: '닉네임을 정확히 입력해주세요.',
    checkingMessage: '닉네임을 확인하고 있어요...',
    invalidMessage:
        '존재하지 않는 닉네임이에요. 다시 확인해주세요.',
    availableMessage: '팀에 추가할 수 있는 멤버예요.',
} as const;

export const REMOVE_MEMBER_MODAL_TEXT = {
    title: '팀 멤버 제거',
    cancelButton: '취소',
    confirmButton: '제거',
    description: (nickname: string) => (
        <>
            {nickname}을/를 팀에서 제거하시겠습니까?
            <br />
            <br />
            제거하면 해당 멤버는 더 이상
            <br />
            팀 예약 신청을 할 수 없습니다.
        </>
    ),
} as const;

export const CHANGE_LEADER_MODAL_TEXT = {
    title: '리더 위임',
    cancelButton: '취소',
    confirmButton: '위임하기',
    description: (nickname: string) => (
        <>
            {nickname}를 리더로 변경해요.
            <br />
            <br />
            기존 리더는 일반 멤버로 전환되며
            <br />
            더 이상 팀을 관리할 수 없어요.
        </>
    ),
} as const;

export const USED_TEAM_COLORS = [
    'var(--team-14)',
    'var(--team-09)',
    'var(--team-16)',
] as const;
