import { InfoCircleIcon } from '../../components/common/icons';
import { DEFAULT_TEAM_NOTICE_MESSAGES } from '../../domains/team/constants';

interface TeamNoticeBoxProps {
    messages?: readonly string[];
}

const TeamNoticeBox = ({
    messages = DEFAULT_TEAM_NOTICE_MESSAGES,
}: TeamNoticeBoxProps) => {
    return (
        <section className="info-box team-notice-box">
            {messages.map((message) => (
                <div
                    key={message}
                    className="info-box__item team-notice-box__item"
                >
                    <InfoCircleIcon size={16} />

                    <p>{message}</p>
                </div>
            ))}
        </section>
    );
};

export default TeamNoticeBox;
