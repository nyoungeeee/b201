import { useState } from 'react';
import {
    useNavigate
} from 'react-router-dom';

import { InfoCircleIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import ChangeLeaderModal from '../components/team/ChangeLeaderModal';

type TeamMember = {
    id: number;
    nickname: string;
    role: 'LEADER' | 'MEMBER';
};

const TEAM_LEADER_CHANGE_TEXT = {
    headerTitle: '리더 위임',
    currentLeaderTitle: '현재 리더',
    selectLeaderTitle: '리더로 변경할 멤버 선택',
    memberBadge: 'Member',
    leaderBadge: 'Leader',
    submitButton: '리더 위임하기',
    toastMessage: '리더가 위임되었어요.',
    notices: [
        '권한을 위임하면 현재 리더는 일반 멤버로 변경돼요.',
        '각 팀의 리더는 1명만 존재할 수 있어요.',
        '리더 위임이 완료되면 현재 계정은 더 이상 팀을 관리할 수 없어요.',
    ],
} as const;

const CURRENT_LEADER: TeamMember = {
    id: 1,
    nickname: '[멤버1닉네임표시]',
    role: 'LEADER',
};

const MEMBERS: TeamMember[] = [
    {
        id: 2,
        nickname: '[멤버2닉네임표시]',
        role: 'MEMBER',
    },
    {
        id: 3,
        nickname: '[멤버3닉네임표시]',
        role: 'MEMBER',
    },
    {
        id: 4,
        nickname: '[멤버4닉네임표시]',
        role: 'MEMBER',
    },
    {
        id: 5,
        nickname: '[멤버5닉네임표시]',
        role: 'MEMBER',
    },
];

const getMemberCardClassName = (
    isSelected: boolean,
) =>
    [
        'team-leader-change-page__member-card',

        isSelected &&
        'team-leader-change-page__member-card--selected',
    ]
        .filter(Boolean)
        .join(' ');

const TeamLeaderChangePage = () => {
    const navigate = useNavigate();

    const [selectedMemberId, setSelectedMemberId] =
        useState<number | null>(
            MEMBERS[0]?.id ?? null,
        );

    const [isModalOpen, setIsModalOpen] =
        useState(false);

    const selectedMember = MEMBERS.find(
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

    const renderMemberCard = (
        member: TeamMember,
    ) => {
        const isSelected =
            selectedMemberId === member.id;

        return (
            <button
                key={member.id}
                type="button"
                className={getMemberCardClassName(
                    isSelected,
                )}
                onClick={() =>
                    handleSelectMember(member.id)
                }
            >
                <span className="team-leader-change-page__nickname">
                    {member.nickname}
                </span>

                <span className="team-leader-change-page__right">
                    <span className="team-leader-change-page__badge">
                        {
                            TEAM_LEADER_CHANGE_TEXT.memberBadge
                        }
                    </span>

                    <span
                        className="team-leader-change-page__radio"
                        aria-hidden="true"
                    >
                        {isSelected && (
                            <span className="team-leader-change-page__radio-dot" />
                        )}
                    </span>
                </span>
            </button>
        );
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

                    <div className="team-leader-change-page__leader-card">
                        <span className="team-leader-change-page__nickname">
                            {CURRENT_LEADER.nickname}
                        </span>

                        <span className="team-leader-change-page__badge team-leader-change-page__badge--leader">
                            {
                                TEAM_LEADER_CHANGE_TEXT.leaderBadge
                            }
                        </span>
                    </div>
                </section>

                <section className="team-leader-change-page__section">
                    <h2 className="team-leader-change-page__title">
                        {
                            TEAM_LEADER_CHANGE_TEXT.selectLeaderTitle
                        }
                    </h2>

                    <div className="team-leader-change-page__list">
                        {MEMBERS.map(renderMemberCard)}
                    </div>
                </section>

                <section className="team-notice-box">
                    {TEAM_LEADER_CHANGE_TEXT.notices.map(
                        (message) => (
                            <div
                                key={message}
                                className="team-notice-box__item"
                            >
                                <InfoCircleIcon
                                    size={16}
                                />

                                <p>{message}</p>
                            </div>
                        ),
                    )}
                </section>

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