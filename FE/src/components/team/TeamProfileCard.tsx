import type { CSSProperties } from 'react';

interface TeamProfileCardProps {
    name: string;
    color: string;
    description?: string;
}

const TEAM_PROFILE_CARD_TEXT = {
    currentColorLabel: '현재 색상',
} as const;

const getTeamColorStyle = (
    color: string,
): CSSProperties =>
    ({
        '--team-color': color,
    }) as CSSProperties;

const TeamProfileCard = ({
    color,
    name,
    description,
}: TeamProfileCardProps) => {
    return (
        <section className="team-profile-card">
            <div className="team-profile-card__summary">
                <div
                    className="team-profile-card__color"
                    style={getTeamColorStyle(color)}
                    aria-hidden="true"
                />

                <div className="team-profile-card__main">
                    <h1 className="team-profile-card__name">
                        {name}
                    </h1>

                    <p className="team-profile-card__color-label">
                        {
                            TEAM_PROFILE_CARD_TEXT.currentColorLabel
                        }
                    </p>
                </div>
            </div>

            <div className="team-profile-card__divider" />

            {description && (
                <p className="team-profile-card__description">
                    {description}
                </p>
            )}
        </section>
    );
};

export default TeamProfileCard;