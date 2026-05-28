import { useState } from 'react';

import { PlusCircleIcon } from '../common/icons';
import { TEAM_MEMBER_LIST_TEXT } from '../../domains/team/constants';
import type { TeamMember } from '../../types/team';
import AddMemberModal from './AddMemberModal';
import TeamMemberItem from './TeamMemberItem';

interface TeamMemberListProps {
    members: TeamMember[];
    isEditMode?: boolean;
    onRemoveMember?: (memberId: number) => void;
    onAddMember?: (nickname: string) => void;
}

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
                    existingMemberNicknames={members.map(
                        (member) => member.nickname,
                    )}
                    onCancel={handleCloseAddMemberModal}
                    onConfirm={handleConfirmAddMember}
                />
            )}
        </>
    );
};

export default TeamMemberList;
