interface TeamEditActionsProps {
    onChangeColor?: () => void;
    onChangeLeader?: () => void;
}

const TeamEditActions = ({
    onChangeColor,
    onChangeLeader,
}: TeamEditActionsProps) => {
    return (
        <section className="team-edit-actions">
            <button
                type="button"
                className="team-edit-actions__button"
                onClick={onChangeColor}
            >
                대표 색상 변경하기
            </button>

            <button
                type="button"
                className="team-edit-actions__button"
                onClick={onChangeLeader}
            >
                리더 위임하기
            </button>
        </section>
    );
};

export default TeamEditActions;