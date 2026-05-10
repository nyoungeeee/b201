import { useState } from 'react';

import { PlusCircleIcon } from '../common/icons';
import AddMemberModal from './AddMemberModal';
import TeamMemberItem from './TeamMemberItem';

export interface TeamMember {
    id: number;
    nickname: string;
    role: 'LEADER' | 'MEMBER';
}

interface TeamMemberListProps {
    members: TeamMember[];
    isEditMode?: boolean;
    onRemoveMember?: (memberId: number) => void;
    onAddMember?: (nickname: string) => void;
}

const TEAM_MEMBER_LIST_TEXT = {
    title: '팀 멤버',
    emptyMessage: '등록된 팀 멤버가 없어요.',
    addButton: '멤버 추가하기',
} as const;

const TeamMemberList = ({
    members,
    isEditMode = false,
    onRemoveMember,
    onAddMember,
}: TeamMemberListProps) => {
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] =
        useState(false);

    const hasMembers = members.length > 0;

    const handleOpenAddMemberModal = () => {
        setIsAddMemberModalOpen(true);
    };

    const handleCloseAddMemberModal = () => {
        setIsAddMemberModalOpen(false);
    };

    const handleConfirmAddMember = (nickname: string) => {
        onAddMember?.(nickname);
        handleCloseAddMemberModal();
    };

    return (
        <>
            <section className="team-member-list">
                <h2 className="team-member-list__title">
                    {TEAM_MEMBER_LIST_TEXT.title}
                </h2>

                {hasMembers ? (
                    <ul className="team-member-list__items">
                        {members.map((member) => (
                            <TeamMemberItem
                                key={member.id}
                                nickname={member.nickname}
                                role={member.role}
                                isEditMode={isEditMode}
                                onRemove={() =>
                                    onRemoveMember?.(member.id)
                                }
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="team-member-list__empty">
                        {TEAM_MEMBER_LIST_TEXT.emptyMessage}
                    </div>
                )}

                {isEditMode && (
                    <button
                        type="button"
                        className="team-member-list__add-button"
                        onClick={handleOpenAddMemberModal}
                    >
                        <PlusCircleIcon size={18} />

                        <span className="team-member-list__add-text">
                            {TEAM_MEMBER_LIST_TEXT.addButton}
                        </span>
                    </button>
                )}
            </section>

            {isAddMemberModalOpen && (
                <AddMemberModal
                    onCancel={handleCloseAddMemberModal}
                    onConfirm={handleConfirmAddMember}
                />
            )}
        </>
    );
};

export default TeamMemberList;