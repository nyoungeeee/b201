import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import ChangeLeaderModal from '../components/team/ChangeLeaderModal';
import TeamLeaderOptionCard from '../components/team/TeamLeaderOptionCard';
import TeamNoticeBox from '../components/team/TeamNoticeBox';
import TeamRoleBadge from '../components/team/TeamRoleBadge';
import { TEAM_LEADER_CHANGE_TEXT } from '../domains/team/constants';
import { useDelegateTeamLeader } from '../hooks/mutations/useTeamMutations';
import { useTeamDetail } from '../hooks/queries/useTeamDetail';
import { useAuthSession } from '../hooks/useAuthSession';
import { TEAM_ROLE } from '../types/team';
import { clearAuthSession } from '../utils/authStorage';

const TeamLeaderChangePage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { accessToken } = useAuthSession();
    const parsedTeamId = Number(id);
    const teamId = Number.isFinite(parsedTeamId)
        ? parsedTeamId
        : undefined;

    const {
        data: team,
        isError,
        isLoading,
        isRefetching,
        refetch,
    } = useTeamDetail({
        teamId,
        accessToken,
        enabled: !!teamId,
    });
    const delegateTeamLeaderMutation = useDelegateTeamLeader({
        accessToken: accessToken ?? undefined,
    });
    const [selectedMemberId, setSelectedMemberId] =
        useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const leader = team?.members.find(
        (member) => member.role === TEAM_ROLE.leader,
    );
    const leaderCandidates = useMemo(
        () =>
            team?.members.filter(
                (member) => member.role !== TEAM_ROLE.leader,
            ) ?? [],
        [team?.members],
    );
    const selectedMemberIdFromCandidates = leaderCandidates.some(
        (member) => member.id === selectedMemberId,
    )
        ? selectedMemberId
        : (leaderCandidates[0]?.id ?? null);
    const selectedMember = leaderCandidates.find(
        (member) => member.id === selectedMemberIdFromCandidates,
    );

    const hasLeaderCandidate = leaderCandidates.length > 0;

    const isSubmitDisabled =
        !selectedMemberIdFromCandidates ||
        delegateTeamLeaderMutation.isPending;

    const handleSelectMember = (memberId: number) => {
        setSelectedMemberId(memberId);
    };

    const handleOpenModal = () => {
        if (!selectedMemberIdFromCandidates) return;

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleConfirmChangeLeader = async () => {
        if (!teamId || !selectedMemberIdFromCandidates) return;

        try {
            await delegateTeamLeaderMutation.mutateAsync({
                teamId,
                userId: selectedMemberIdFromCandidates,
            });

            clearAuthSession();
            navigate('/', {
                replace: true,
                state: {
                    toastMessage: TEAM_LEADER_CHANGE_TEXT.toastMessage,
                },
            });
        } catch (error) {
            console.error('Team leader delegation failed:', error);
        }
    };

    return (
        <MobilePageLayout
            isRefreshing={isRefetching}
            onRefresh={() => refetch()}
            header={
                <PageSubHeader
                    title={TEAM_LEADER_CHANGE_TEXT.headerTitle}
                />
            }
        >
            <main className="team-leader-change-page">
                {isLoading && (
                    <section className="page-empty">
                        {TEAM_LEADER_CHANGE_TEXT.loading}
                    </section>
                )}

                {isError && (
                    <section className="page-empty">
                        {TEAM_LEADER_CHANGE_TEXT.error}
                    </section>
                )}

                {!isLoading && !isError && team && (
                    <>
                        <section className="team-leader-change-page__section">
                            <h2 className="team-leader-change-page__title">
                                {
                                    TEAM_LEADER_CHANGE_TEXT.currentLeaderTitle
                                }
                            </h2>

                            {leader && (
                                <div className="card-row team-leader-change-page__leader-card">
                                    <span className="card-row__title team-leader-change-page__nickname">
                                        {leader.nickname}
                                    </span>

                                    <TeamRoleBadge role={leader.role} />
                                </div>
                            )}
                        </section>

                        <section className="team-leader-change-page__section">
                            <h2 className="team-leader-change-page__title">
                                {
                                    TEAM_LEADER_CHANGE_TEXT.selectLeaderTitle
                                }
                            </h2>

                            {hasLeaderCandidate ? (
                                <div className="team-leader-change-page__list">
                                    {leaderCandidates.map((member) => (
                                        <TeamLeaderOptionCard
                                            key={member.id}
                                            member={member}
                                            isSelected={
                                                selectedMemberIdFromCandidates ===
                                                member.id
                                            }
                                            onSelect={handleSelectMember}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="page-empty">
                                    {
                                        TEAM_LEADER_CHANGE_TEXT.emptyCandidate
                                    }
                                </div>
                            )}
                        </section>

                        <TeamNoticeBox
                            messages={TEAM_LEADER_CHANGE_TEXT.notices}
                        />

                        <button
                            type="button"
                            className="team-leader-change-page__submit-button"
                            disabled={isSubmitDisabled}
                            onClick={handleOpenModal}
                        >
                            {TEAM_LEADER_CHANGE_TEXT.submitButton}
                        </button>
                    </>
                )}
            </main>

            {isModalOpen && selectedMember && (
                <ChangeLeaderModal
                    id={selectedMember.id}
                    nickname={selectedMember.nickname}
                    isConfirmDisabled={
                        delegateTeamLeaderMutation.isPending
                    }
                    onCancel={handleCloseModal}
                    onConfirm={handleConfirmChangeLeader}
                />
            )}
        </MobilePageLayout>
    );
};

export default TeamLeaderChangePage;
