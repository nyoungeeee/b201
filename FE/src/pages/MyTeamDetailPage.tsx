import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import RemoveMemberModal from '../components/team/RemoveMemberModal';
import TeamEditActions from '../components/team/TeamEditActions';
import TeamMemberList from '../components/team/TeamMemberList';
import TeamNoticeBox from '../components/team/TeamNoticeBox';
import TeamProfileCard from '../components/team/TeamProfileCard';

const MY_TEAM_DETAIL_TEXT = {
    headerTitle: '팀 멤버',
    editButton: '편집',
    doneButton: '완료',
    removeSuccessToast: '팀 멤버가 제거되었어요.',
    addSuccessToast: '팀 멤버가 추가되었어요.',
} as const;

type TeamMember = {
    id: number;
    nickname: string;
    role: 'LEADER' | 'MEMBER';
};

const MOCK_MEMBERS: TeamMember[] = [
    { id: 1, nickname: '[멤버1닉네임표시]', role: 'LEADER' },
    { id: 2, nickname: '[멤버2닉네임표시]', role: 'MEMBER' },
    { id: 3, nickname: '[멤버3닉네임표시]', role: 'MEMBER' },
];

const MOCK_TEAM_INFO = {
    id: 1,
    name: '[내가속한팀명1]',
    color: '#06d6a0',
    description: '[내가속한팀명1] 멤버를 확인할 수 있어요.',
} as const;

type RemoveTarget = {
    id: number;
    nickname: string;
};

type LocationState = {
    isEditMode?: boolean;
};

const getEditButtonClassName = (isEditMode: boolean) =>
    [
        'my-team-detail-page__edit-button',
        isEditMode && 'my-team-detail-page__edit-button--active',
    ]
        .filter(Boolean)
        .join(' ');

const MyTeamDetailPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const locationState = location.state as LocationState | null;

    const [isEditMode, setIsEditMode] = useState(
        locationState?.isEditMode ?? false,
    );
    const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

    const isLeader = true;

    const showToast = (toastMessage: string) => {
        navigate(location.pathname, {
            replace: true,
            state: {
                toastMessage,
            },
        });
    };

    const handleToggleEditMode = () => {
        setIsEditMode((prev) => !prev);
    };

    const handleOpenRemoveModal = (memberId: number) => {
        const target = MOCK_MEMBERS.find((member) => member.id === memberId);

        if (!target) return;

        setRemoveTarget({
            id: target.id,
            nickname: target.nickname,
        });
    };

    const handleCloseRemoveModal = () => {
        setRemoveTarget(null);
    };

    const handleConfirmRemoveMember = () => {
        if (!removeTarget) return;

        setRemoveTarget(null);
        showToast(MY_TEAM_DETAIL_TEXT.removeSuccessToast);
    };

    const handleAddMember = () => {
        showToast(MY_TEAM_DETAIL_TEXT.addSuccessToast);
    };

    return (
        <MobilePageLayout>
            <PageSubHeader
                title={MY_TEAM_DETAIL_TEXT.headerTitle}
                rightContent={
                    isLeader && (
                        <button
                            type="button"
                            className={getEditButtonClassName(isEditMode)}
                            onClick={handleToggleEditMode}
                        >
                            {isEditMode
                                ? MY_TEAM_DETAIL_TEXT.doneButton
                                : MY_TEAM_DETAIL_TEXT.editButton}
                        </button>
                    )
                }
            />

            <main className="my-team-detail-page">
                <TeamProfileCard
                    name={MOCK_TEAM_INFO.name}
                    color={MOCK_TEAM_INFO.color}
                    description={MOCK_TEAM_INFO.description}
                />

                <TeamMemberList
                    members={MOCK_MEMBERS}
                    isEditMode={isEditMode}
                    onRemoveMember={handleOpenRemoveModal}
                    onAddMember={handleAddMember}
                />

                <TeamNoticeBox />

                {isEditMode && (
                    <TeamEditActions
                        teamId={MOCK_TEAM_INFO.id}
                        teamName={MOCK_TEAM_INFO.name}
                        teamColor={MOCK_TEAM_INFO.color}
                    />
                )}
            </main>

            {removeTarget && (
                <RemoveMemberModal
                    nickname={removeTarget.nickname}
                    onCancel={handleCloseRemoveModal}
                    onConfirm={handleConfirmRemoveMember}
                />
            )}
        </MobilePageLayout>
    );
};

export default MyTeamDetailPage;