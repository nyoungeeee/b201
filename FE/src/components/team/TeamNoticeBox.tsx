import { InfoCircleIcon } from '../../components/common/icons';

const TEAM_NOTICE_MESSAGES = [
    '팀 리더만 멤버를 추가하거나 제거할 수 있어요.',
    '팀 멤버는 팀의 합주실 예약을 신청할 수 있어요.',
    '팀 멤버는 팀의 예약 현황을 확인할 수 있어요.',
    '멤버를 제거하더라도 해당 멤버가 신청한 팀 예약 내역은 사라지지 않아요.',
] as const;

const TeamNoticeBox = () => {
    return (
        <section className="team-notice-box">
            {TEAM_NOTICE_MESSAGES.map((message) => (
                <div
                    key={message}
                    className="team-notice-box__item"
                >
                    <InfoCircleIcon size={16} />

                    <p>{message}</p>
                </div>
            ))}
        </section>
    );
};

export default TeamNoticeBox;