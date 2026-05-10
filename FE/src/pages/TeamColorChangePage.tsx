import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import TeamColorPicker from '../components/team/TeamColorPicker';
import TeamProfileCard from '../components/team/TeamProfileCard';

import { TEAM_COLOR_TEXT } from '../domains/team/constants';
import {
    isUsedTeamColor,
    toTeamColorVar,
} from '../domains/team/colors';
import { TEAM_ROUTE } from '../domains/team/routes';
import type { TeamSummary } from '../types/team';

type LocationState = {
    team?: TeamSummary;
};

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
        if (isUsedTeamColor(color)) return;

        setSelectedColor(color);
    };

    const handleSubmit = () => {
        if (!isChanged || !teamId) return;

        // TODO: 대표 색상 변경 API 연동
        navigate(TEAM_ROUTE.detail(teamId), {
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

                <TeamColorPicker
                    currentColor={currentColor}
                    selectedColor={selectedColor}
                    onSelectColor={handleSelectColor}
                />

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
