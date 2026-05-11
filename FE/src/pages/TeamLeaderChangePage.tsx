import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import ChangeLeaderModal from '../components/team/ChangeLeaderModal';
import TeamLeaderOptionCard from '../components/team/TeamLeaderOptionCard';
import TeamNoticeBox from '../components/team/TeamNoticeBox';
import TeamRoleBadge from '../components/team/TeamRoleBadge';
import { TEAM_LEADER_CHANGE_TEXT } from '../domains/team/constants';
import {
    MOCK_CURRENT_LEADER,
    MOCK_LEADER_CANDIDATES,
} from '../domains/team/mock';

const TeamLeaderChangePage = () => {
    const navigate = useNavigate();

    const [selectedMemberId, setSelectedMemberId] =
        useState<number | null>(
            MOCK_LEADER_CANDIDATES[0]?.id ?? null,
        );

    const [isModalOpen, setIsModalOpen] =
        useState(false);

    const selectedMember = MOCK_LEADER_CANDIDATES.find(
        (member) =>
            member.id === selectedMemberId,
    );

    const handleSelectMember = (
        memberId: number,
    ) => {
        setSelectedMemberId(memberId);
    };

    const handleOpenModal = () => {
        if (!selectedMemberId) return;

        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleConfirmChangeLeader = () => {
        if (!selectedMemberId) return;

        navigate('/', {
            replace: true,
            state: {
                toastMessage:
                    TEAM_LEADER_CHANGE_TEXT.toastMessage,
            },
        });
    };

    return (
        <MobilePageLayout
            header={
                <PageSubHeader
                    title={
                        TEAM_LEADER_CHANGE_TEXT.headerTitle
                    }
                />
            }
        >
            <main className="team-leader-change-page">
                <section className="team-leader-change-page__section">
                    <h2 className="team-leader-change-page__title">
                        {
                            TEAM_LEADER_CHANGE_TEXT.currentLeaderTitle
                        }
                    </h2>

                    <div className="card-row team-leader-change-page__leader-card">
                        <span className="card-row__title team-leader-change-page__nickname">
                            {MOCK_CURRENT_LEADER.nickname}
                        </span>

                        <TeamRoleBadge role={MOCK_CURRENT_LEADER.role} />
                    </div>
                </section>

                <section className="team-leader-change-page__section">
                    <h2 className="team-leader-change-page__title">
                        {
                            TEAM_LEADER_CHANGE_TEXT.selectLeaderTitle
                        }
                    </h2>

                    <div className="team-leader-change-page__list">
                        {MOCK_LEADER_CANDIDATES.map((member) => (
                            <TeamLeaderOptionCard
                                key={member.id}
                                member={member}
                                isSelected={
                                    selectedMemberId === member.id
                                }
                                onSelect={handleSelectMember}
                            />
                        ))}
                    </div>
                </section>

                <TeamNoticeBox
                    messages={TEAM_LEADER_CHANGE_TEXT.notices}
                />

                <button
                    type="button"
                    className="team-leader-change-page__submit-button"
                    disabled={!selectedMemberId}
                    onClick={handleOpenModal}
                >
                    {
                        TEAM_LEADER_CHANGE_TEXT.submitButton
                    }
                </button>
            </main>

            {isModalOpen &&
                selectedMember && (
                    <ChangeLeaderModal
                        id={selectedMember.id}
                        nickname={
                            selectedMember.nickname
                        }
                        onCancel={
                            handleCloseModal
                        }
                        onConfirm={
                            handleConfirmChangeLeader
                        }
                    />
                )}
        </MobilePageLayout>
    );
};

export default TeamLeaderChangePage;
