import type { CSSProperties } from 'react';

interface TeamProfileCardProps {
    name: string;
    color: string;
    description?: string;
}

const TeamProfileCard = ({
    name,
    color,
    description = '',
}: TeamProfileCardProps) => {
    return (
        <section className="team-profile-card">
            <div className="team-profile-card__summary">
                <div
                    className="team-profile-card__color"
                    style={{ '--team-color': color } as CSSProperties}
                    aria-hidden="true"
                />

                <div className="team-profile-card__main">
                    <h1 className="team-profile-card__name">{name}</h1>

                    <p className="team-profile-card__color-label">
                        현재 색상
                    </p>
                </div>
            </div>

            <div className="team-profile-card__divider" />

            <p className="team-profile-card__description">
                {description}
            </p>
        </section>
    );
};

export default TeamProfileCard;