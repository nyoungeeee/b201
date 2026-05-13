import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import TeamColorPicker from '../components/team/TeamColorPicker';
import TeamProfileCard from '../components/team/TeamProfileCard';

import { TEAM_COLOR_TEXT } from '../domains/team/constants';
import { TEAM_ROUTE } from '../domains/team/routes';
import { useUpdateTeamConfig } from '../hooks/mutations/useTeamMutations';
import { useTeamColors } from '../hooks/queries/useTeamColors';
import { useAuthSession } from '../hooks/useAuthSession';
import type { TeamColorOption, TeamSummary } from '../types/team';

type LocationState = {
    team?: TeamSummary;
};

const TEAM_COLOR_PAGE_TEXT = {
    loading: '팀 색상을 불러오고 있어요.',
    error: '팀 색상을 불러오지 못했어요.',
} as const;

const findCurrentColor = ({
    colors,
    team,
}: {
    colors: TeamColorOption[];
    team?: TeamSummary;
}) => {
    if (!team) return undefined;

    return colors.find((color) => {
        if (team.colorId && color.id === team.colorId) return true;

        return color.color.toLowerCase() === team.color.toLowerCase();
    });
};

const TeamColorChangePage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { accessToken } = useAuthSession();

    const locationState =
        location.state as LocationState | null;

    const team = locationState?.team;
    const teamId = team?.id;

    const {
        data: colors = [],
        isError,
        isLoading,
    } = useTeamColors({
        teamId,
        accessToken,
        enabled: !!teamId,
    });

    const updateTeamConfigMutation = useUpdateTeamConfig({
        accessToken: accessToken ?? undefined,
    });

    const currentColor = useMemo(
        () => findCurrentColor({ colors, team }),
        [colors, team],
    );

    const [selectedColor, setSelectedColor] =
        useState<TeamColorOption | undefined>(currentColor);

    useEffect(() => {
        setSelectedColor(currentColor);
    }, [currentColor]);

    const isChanged =
        !!selectedColor &&
        !!currentColor &&
        selectedColor.id !== currentColor.id;
    const isSubmitting = updateTeamConfigMutation.isPending;

    const handleSelectColor = (color: TeamColorOption) => {
        if (!color.available && color.id !== currentColor?.id) return;

        setSelectedColor(color);
    };

    const handleSubmit = async () => {
        if (!isChanged || !teamId || !selectedColor) return;

        try {
            await updateTeamConfigMutation.mutateAsync({
                teamId,
                colorId: selectedColor.id,
            });

            navigate(TEAM_ROUTE.detail(teamId), {
                replace: true,
                state: {
                    toastMessage:
                        TEAM_COLOR_TEXT.toastMessage,
                    isEditMode: true,
                },
            });
        } catch (error) {
            console.error('Team color update failed:', error);
        }
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
                    color={selectedColor?.color ?? team?.color ?? ''}
                    name={team?.name ?? ''}
                    description={
                        TEAM_COLOR_TEXT.description
                    }
                />

                {isLoading && (
                    <section className="page-empty">
                        {TEAM_COLOR_PAGE_TEXT.loading}
                    </section>
                )}

                {isError && (
                    <section className="page-empty">
                        {TEAM_COLOR_PAGE_TEXT.error}
                    </section>
                )}

                {!isLoading && !isError && (
                    <TeamColorPicker
                        colors={colors}
                        currentColorId={currentColor?.id}
                        selectedColorId={selectedColor?.id}
                        onSelectColor={handleSelectColor}
                    />
                )}

                <button
                    type="button"
                    className="team-color-page__submit"
                    disabled={!isChanged || isSubmitting}
                    onClick={handleSubmit}
                >
                    {TEAM_COLOR_TEXT.submitButton}
                </button>
            </main>
        </MobilePageLayout>
    );
};

export default TeamColorChangePage;
