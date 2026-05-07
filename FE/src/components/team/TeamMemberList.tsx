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
    onAddMember?: () => void;
}

const TeamMemberList = ({
    members,
    isEditMode = false,
    onRemoveMember,
    onAddMember,
}: TeamMemberListProps) => {
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] =
        useState(false);

    const handleOpenAddMemberModal = () => {
        setIsAddMemberModalOpen(true);
    };

    const handleCloseAddMemberModal = () => {
        setIsAddMemberModalOpen(false);
    };

    return (
        <>
            <section className="team-member-list">
                <h2 className="team-member-list__title">
                    팀 멤버
                </h2>

                {members.length > 0 ? (
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
                        등록된 팀 멤버가 없어요.
                    </div>
                )}

                {isEditMode && (
                    <button
                        type="button"
                        className="team-member-list__add-button"
                        onClick={
                            handleOpenAddMemberModal
                        }
                    >
                        <PlusCircleIcon size={18} />

                        <span className="team-member-list__add-text">
                            멤버 추가하기
                        </span>
                    </button>
                )}
            </section>

            {isAddMemberModalOpen && (
                <AddMemberModal
                    onCancel={
                        handleCloseAddMemberModal
                    }
                    onConfirm={(nickname) => {
                        onAddMember?.();

                        console.log(nickname);

                        handleCloseAddMemberModal();
                    }}
                />
            )}
        </>
    );
};

export default TeamMemberList;