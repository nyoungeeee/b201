import { LockIcon } from '../common/icons';
import { TEAM_COLOR_TEXT } from '../../domains/team/constants';
import { isUsedTeamColor } from '../../domains/team/colors';
import { TEAM_COLOR_OPTIONS } from '../../utils/commonUtils';

interface TeamColorPickerProps {
    currentColor: string;
    selectedColor: string;
    onSelectColor: (color: string) => void;
}

const getColorLabel = ({
    color,
    currentColor,
    selectedColor,
}: {
    color: string;
    currentColor: string;
    selectedColor: string;
}) => {
    if (isUsedTeamColor(color)) {
        return TEAM_COLOR_TEXT.usedLabel;
    }

    if (
        color === selectedColor &&
        color !== currentColor
    ) {
        return TEAM_COLOR_TEXT.selectedLabel;
    }

    if (color === currentColor) {
        return TEAM_COLOR_TEXT.currentLabel;
    }

    return '';
};

const hasOuterRing = ({
    color,
    currentColor,
    selectedColor,
}: {
    color: string;
    currentColor: string;
    selectedColor: string;
}) => {
    if (selectedColor === currentColor) {
        return color === currentColor;
    }

    return color === selectedColor;
};

const getColorButtonClassName = ({
    color,
    currentColor,
    selectedColor,
}: {
    color: string;
    currentColor: string;
    selectedColor: string;
}) =>
    [
        'team-color-page__color-button',

        hasOuterRing({
            color,
            currentColor,
            selectedColor,
        }) && 'has-outer-ring',

        isUsedTeamColor(color) && 'is-used',
    ]
        .filter(Boolean)
        .join(' ');

const getColorButtonStyle = (
    color: string,
): React.CSSProperties & {
    '--team-color': string;
} => ({
    '--team-color': color,
});

const getColorAriaLabel = ({
    color,
    label,
}: {
    color: string;
    label: string;
}) => label || `${color} 색상 선택`;

const TeamColorPicker = ({
    currentColor,
    selectedColor,
    onSelectColor,
}: TeamColorPickerProps) => {
    return (
        <section className="team-color-page__section">
            <h2 className="team-color-page__title">
                {TEAM_COLOR_TEXT.sectionTitle}
            </h2>

            <ul className="team-color-page__color-list">
                {TEAM_COLOR_OPTIONS.map((color) => {
                    const label = getColorLabel({
                        color,
                        currentColor,
                        selectedColor,
                    });

                    return (
                        <li
                            key={color}
                            className="team-color-page__color-item"
                        >
                            <button
                                type="button"
                                className={getColorButtonClassName({
                                    color,
                                    currentColor,
                                    selectedColor,
                                })}
                                style={getColorButtonStyle(color)}
                                onClick={() => onSelectColor(color)}
                                disabled={isUsedTeamColor(color)}
                                aria-label={getColorAriaLabel({
                                    color,
                                    label,
                                })}
                            >
                                {isUsedTeamColor(color) && (
                                    <span className="team-color-page__lock">
                                        <LockIcon size={15} />
                                    </span>
                                )}
                            </button>

                            <span className="team-color-page__label">
                                {label}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default TeamColorPicker;
