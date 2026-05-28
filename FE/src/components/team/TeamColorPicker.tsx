import type { CSSProperties } from 'react';

import { LockIcon } from '../common/icons';
import { TEAM_COLOR_TEXT } from '../../domains/team/constants';
import type { TeamColorOption } from '../../types/team';

interface TeamColorPickerProps {
    colors: TeamColorOption[];
    currentColorId?: number | null;
    selectedColorId?: number | null;
    onSelectColor: (color: TeamColorOption) => void;
}

const getColorLabel = ({
    color,
    currentColorId,
    selectedColorId,
}: {
    color: TeamColorOption;
    currentColorId?: number | null;
    selectedColorId?: number | null;
}) => {
    if (
        color.id === selectedColorId &&
        color.id !== currentColorId
    ) {
        return TEAM_COLOR_TEXT.selectedLabel;
    }

    if (color.id === currentColorId) {
        return TEAM_COLOR_TEXT.currentLabel;
    }

    if (!color.available) {
        return TEAM_COLOR_TEXT.usedLabel;
    }

    return '';
};

const hasOuterRing = ({
    color,
    currentColorId,
    selectedColorId,
}: {
    color: TeamColorOption;
    currentColorId?: number | null;
    selectedColorId?: number | null;
}) => {
    if (selectedColorId === currentColorId) {
        return color.id === currentColorId;
    }

    return color.id === selectedColorId;
};

const isDisabledColor = ({
    color,
    currentColorId,
}: {
    color: TeamColorOption;
    currentColorId?: number | null;
}) => !color.available && color.id !== currentColorId;

const getColorButtonClassName = ({
    color,
    currentColorId,
    selectedColorId,
}: {
    color: TeamColorOption;
    currentColorId?: number | null;
    selectedColorId?: number | null;
}) =>
    [
        'team-color-page__color-button',

        hasOuterRing({
            color,
            currentColorId,
            selectedColorId,
        }) && 'has-outer-ring',

        isDisabledColor({ color, currentColorId }) && 'is-used',
    ]
        .filter(Boolean)
        .join(' ');

const getColorButtonStyle = (
    color: string,
): CSSProperties & {
    '--team-color': string;
} => ({
    '--team-color': color,
});

const getColorAriaLabel = ({
    color,
    label,
}: {
    color: TeamColorOption;
    label: string;
}) => label || `${color.color} 색상 선택`;

const TeamColorPicker = ({
    colors,
    currentColorId,
    selectedColorId,
    onSelectColor,
}: TeamColorPickerProps) => {
    return (
        <section className="team-color-page__section">
            <h2 className="team-color-page__title">
                {TEAM_COLOR_TEXT.sectionTitle}
            </h2>

            <ul className="team-color-page__color-list">
                {colors.map((color) => {
                    const disabled = isDisabledColor({
                        color,
                        currentColorId,
                    });
                    const label = getColorLabel({
                        color,
                        currentColorId,
                        selectedColorId,
                    });

                    return (
                        <li
                            key={color.id}
                            className="team-color-page__color-item"
                        >
                            <button
                                type="button"
                                className={getColorButtonClassName({
                                    color,
                                    currentColorId,
                                    selectedColorId,
                                })}
                                style={getColorButtonStyle(color.color)}
                                onClick={() => onSelectColor(color)}
                                disabled={disabled}
                                aria-label={getColorAriaLabel({
                                    color,
                                    label,
                                })}
                            >
                                {disabled && (
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
