import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { LockIcon } from '../components/common/icons';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import TeamProfileCard from '../components/team/TeamProfileCard';

import {
    TEAM_COLOR_OPTIONS,
    toTeamColorVar,
} from '../utils/commonUtils';

type Team = {
    id: number;
    name: string;
    color: string;
};

type LocationState = {
    team?: Team;
};

const TEAM_COLOR_TEXT = {
    headerTitle: '팀 대표 색상 변경',
    sectionTitle: '색상 선택',
    description:
        '선택한 색상은 팀 예약과 팀 정보에 대표 색상으로 표시됩니다.',
    submitButton: '대표 색상 변경하기',
    toastMessage: '팀 대표 색상이 변경되었어요.',
    usedLabel: '사용 중',
    selectedLabel: '선택한 색상',
    currentLabel: '현재 팀 색상',
} as const;

const USED_COLORS = [
    'var(--team-14)',
    'var(--team-09)',
    'var(--team-16)',
] as const;

const isUsedColor = (color: string) =>
    USED_COLORS.includes(color as (typeof USED_COLORS)[number]);

const getColorLabel = ({
    color,
    currentColor,
    selectedColor,
}: {
    color: string;
    currentColor: string;
    selectedColor: string;
}) => {
    if (isUsedColor(color)) {
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

        isUsedColor(color) && 'is-used',
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

const TeamColorChangePage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const locationState =
        location.state as LocationState | null;

    const team = locationState?.team;

    const teamId = team?.id;

    const currentColor = toTeamColorVar(
        team?.color ?? '',
    );

    const [selectedColor, setSelectedColor] =
        useState(currentColor);

    const isChanged = selectedColor !== currentColor;

    const handleSelectColor = (color: string) => {
        if (isUsedColor(color)) return;

        setSelectedColor(color);
    };

    const handleSubmit = () => {
        if (!isChanged || !teamId) return;

        // TODO: 대표 색상 변경 API 연동
        navigate(`/team/${teamId}`, {
            replace: true,
            state: {
                toastMessage:
                    TEAM_COLOR_TEXT.toastMessage,
                isEditMode: true,
            },
        });
    };

    return (
        <MobilePageLayout
            header={
                <PageSubHeader
                    title={TEAM_COLOR_TEXT.headerTitle}
                />
            }
        >
            <main className="team-color-page">
                <TeamProfileCard
                    color={currentColor}
                    name={team?.name ?? ''}
                    description={
                        TEAM_COLOR_TEXT.description
                    }
                />

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
                                        style={getColorButtonStyle(
                                            color,
                                        )}
                                        onClick={() =>
                                            handleSelectColor(
                                                color,
                                            )
                                        }
                                        disabled={isUsedColor(
                                            color,
                                        )}
                                        aria-label={getColorAriaLabel({
                                            color,
                                            label,
                                        })}
                                    >
                                        {isUsedColor(
                                            color,
                                        ) && (
                                                <span className="team-color-page__lock">
                                                    <LockIcon
                                                        size={15}
                                                    />
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

                <button
                    type="button"
                    className="team-color-page__submit"
                    disabled={!isChanged}
                    onClick={handleSubmit}
                >
                    {TEAM_COLOR_TEXT.submitButton}
                </button>
            </main>
        </MobilePageLayout>
    );
};

export default TeamColorChangePage;