import { useState } from 'react';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';

import { useNavigate } from 'react-router-dom';
import RemoveMemberModal from '../components/team/RemoveMemberModal';
import TeamEditActions from '../components/team/TeamEditActions';
import TeamMemberList from '../components/team/TeamMemberList';
import TeamNoticeBox from '../components/team/TeamNoticeBox';
import TeamProfileCard from '../components/team/TeamProfileCard';

const mockMembers = [
    { id: 1, nickname: '[멤버1닉네임표시]', role: 'LEADER' as const },
    { id: 2, nickname: '[멤버2닉네임표시]', role: 'MEMBER' as const },
    { id: 3, nickname: '[멤버3닉네임표시]', role: 'MEMBER' as const },
];

const MyTeamDetailPage = () => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [removeTarget, setRemoveTarget] = useState<{
        id: number;
        nickname: string;
    } | null>(null);

    const [teamInfo] = useState({
        id: 1,
        name: '[내가속한팀명1]',
        color: '#16D9B3',
        description: '[내가속한팀명1] 멤버를 확인할 수 있어요.',
    });

    const isLeader = true;

    const handleOpenRemoveModal = (memberId: number) => {
        const target = mockMembers.find((member) => member.id === memberId);

        if (!target) return;

        setRemoveTarget({
            id: target.id,
            nickname: target.nickname,
        });
    };

    const handleCloseRemoveModal = () => {
        setRemoveTarget(null);
    };

    const navigate = useNavigate();
    const handleConfirmRemoveMember = () => {
        if (!removeTarget) return;

        setRemoveTarget(null);
        navigate(location.pathname, {
            replace: true,
            state: {
                toastMessage: '팀 멤버가 제거되었어요.',
            },
        });
    };

    return (
        <MobilePageLayout>
            <PageSubHeader
                title="팀 멤버"
                rightContent={
                    isLeader && (
                        <button
                            type="button"
                            className={`my-team-detail-page__edit-button ${isEditMode
                                ? 'my-team-detail-page__edit-button--active'
                                : ''
                                }`}
                            onClick={() => setIsEditMode((prev) => !prev)}
                        >
                            {isEditMode ? '완료' : '편집'}
                        </button>
                    )
                }
            />

            <main className="my-team-detail-page">
                <TeamProfileCard
                    name={teamInfo.name}
                    color={teamInfo.color}
                    description={teamInfo.description}
                />

                <TeamMemberList
                    members={mockMembers}
                    isEditMode={isEditMode}
                    onRemoveMember={handleOpenRemoveModal}
                    onAddMember={() => {
                        navigate(location.pathname, {
                            replace: true,
                            state: {
                                toastMessage: '팀 멤버가 추가되었어요.',
                            },
                        });
                    }}
                />
                <TeamNoticeBox />
                {isEditMode && <TeamEditActions />}


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