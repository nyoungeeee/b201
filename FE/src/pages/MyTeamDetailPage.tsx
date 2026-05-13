import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import RemoveMemberModal from '../components/team/RemoveMemberModal';
import TeamEditActions from '../components/team/TeamEditActions';
import TeamMemberList from '../components/team/TeamMemberList';
import TeamNoticeBox from '../components/team/TeamNoticeBox';
import TeamProfileCard from '../components/team/TeamProfileCard';
import {
    MY_TEAM_DETAIL_TEXT,
    MY_TEAM_TEXT,
} from '../domains/team/constants';
import {
    useAddTeamMember,
    useRemoveTeamMember,
} from '../hooks/mutations/useTeamMutations';
import { useAuthSession } from '../hooks/useAuthSession';
import { useTeamDetail } from '../hooks/queries/useTeamDetail';

type RemoveTarget = {
    id: number;
    nickname: string;
};

type LocationState = {
    isEditMode?: boolean;
};

const TEAM_DETAIL_PAGE_TEXT = {
    loading: '팀 정보를 불러오고 있어요.',
    error: '팀 정보를 불러오지 못했어요.',
} as const;

const getTeamDescription = (teamName: string, isEditMode: boolean) =>
    isEditMode
        ? '멤버를 관리하거나 대표 색상 변경, 리더 위임 기능을 사용할 수 있어요.'
        : `${teamName} 멤버를 확인할 수 있어요.`;

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
    const { id } = useParams();
    const { accessToken } = useAuthSession();

    const locationState = location.state as LocationState | null;
    const parsedTeamId = Number(id);
    const teamId = Number.isFinite(parsedTeamId)
        ? parsedTeamId
        : undefined;

    const {
        data: team,
        isError,
        isLoading,
    } = useTeamDetail({
        teamId,
        accessToken,
        enabled: !!teamId,
    });
    const addTeamMemberMutation = useAddTeamMember({
        accessToken: accessToken ?? undefined,
    });
    const removeTeamMemberMutation = useRemoveTeamMember({
        accessToken: accessToken ?? undefined,
    });

    const [isEditMode, setIsEditMode] = useState(
        locationState?.isEditMode ?? false,
    );
    const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

    const isLeader = team?.isLeader ?? false;
    const canEdit = isLeader && isEditMode;

    const showToast = (toastMessage: string) => {
        navigate(location.pathname, {
            replace: true,
            state: {
                toastMessage,
            },
        });
    };

    const handleToggleEditMode = () => {
        if (!isLeader) return;

        setIsEditMode((prev) => !prev);
    };

    const handleOpenRemoveModal = (memberId: number) => {
        if (!team?.isLeader) return;

        const target = team.members.find(
            (member) => member.id === memberId,
        );

        if (!target) return;

        setRemoveTarget({
            id: target.id,
            nickname: target.nickname,
        });
    };

    const handleCloseRemoveModal = () => {
        setRemoveTarget(null);
    };

    const handleConfirmRemoveMember = async () => {
        if (!removeTarget || !team?.isLeader || !teamId) return;

        try {
            await removeTeamMemberMutation.mutateAsync({
                teamId,
                memberId: removeTarget.id,
            });
            setRemoveTarget(null);
            showToast(MY_TEAM_DETAIL_TEXT.removeSuccessToast);
        } catch (error) {
            console.error('Team member remove failed:', error);
        }
    };

    const handleAddMember = async (nickname: string) => {
        if (!team?.isLeader || !teamId) return;

        try {
            await addTeamMemberMutation.mutateAsync({
                teamId,
                nickname,
            });
            showToast(MY_TEAM_DETAIL_TEXT.addSuccessToast);
        } catch (error) {
            console.error('Team member add failed:', error);
        }
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
                {isLoading && (
                    <section className="page-empty">
                        {TEAM_DETAIL_PAGE_TEXT.loading}
                    </section>
                )}

                {isError && (
                    <section className="page-empty">
                        {TEAM_DETAIL_PAGE_TEXT.error}
                    </section>
                )}

                {!isLoading && !isError && team && (
                    <>
                        <TeamProfileCard
                            name={team.name}
                            color={team.color}
                            description={getTeamDescription(
                                team.name,
                                canEdit,
                            )}
                        />

                        <TeamMemberList
                            members={team.members}
                            isEditMode={canEdit}
                            onRemoveMember={handleOpenRemoveModal}
                            onAddMember={handleAddMember}
                        />

                        <TeamNoticeBox />

                        {canEdit && (
                            <TeamEditActions
                                teamId={team.id}
                                teamName={team.name}
                                teamColor={team.color}
                                teamColorId={team.colorId}
                            />
                        )}
                    </>
                )}

                {!isLoading && !isError && !team && (
                    <section className="my-team-page__empty">
                        <p className="my-team-page__empty-title">
                            {MY_TEAM_TEXT.emptyTitle}
                        </p>

                        <p className="my-team-page__empty-description">
                            {MY_TEAM_TEXT.emptyDescription}
                        </p>
                    </section>
                )}
            </main>

            {removeTarget && (
                <RemoveMemberModal
                    nickname={removeTarget.nickname}
                    isConfirmDisabled={removeTeamMemberMutation.isPending}
                    onCancel={handleCloseRemoveModal}
                    onConfirm={handleConfirmRemoveMember}
                />
            )}
        </MobilePageLayout>
    );
};

export default MyTeamDetailPage;
