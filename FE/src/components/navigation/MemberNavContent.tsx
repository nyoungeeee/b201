import logo from "../../assets/B201_logo.png";

type Props = {
    nickname?: string;
};

const MemberNavContent = ({ nickname = "닉네임은여덟글자" }: Props) => {
    return (
        <>
            <div className="side-nav-modal__member-header">
                <div className="side-nav-modal__logo side-nav-modal__logo--member">
                    <img src={logo} alt="B201" />
                </div>

                <div className="side-nav-modal__user">
                    <p className="side-nav-modal__greeting">
                        B201에 어서오세요!
                    </p>
                    <p className="side-nav-modal__nickname">
                        {nickname}
                        <span className="side-nav-modal__nickname-suffix"> 님</span>
                    </p>
                </div>
            </div>

            <div className="side-nav-modal__divider" />

            <nav className="side-nav-modal__menu">
                <button type="button" className="side-nav-modal__menu-item">
                    <span>예약 현황</span>
                </button>

                <button type="button" className="side-nav-modal__menu-item">
                    <span>내 예약 확인</span>
                    <span className="side-nav-modal__arrow">›</span>
                </button>

                <button type="button" className="side-nav-modal__menu-item">
                    <span>내 정보 관리</span>
                    <span className="side-nav-modal__arrow">›</span>
                </button>

                <button type="button" className="side-nav-modal__menu-item">
                    <span>내 팀 관리</span>
                    <span className="side-nav-modal__arrow">›</span>
                </button>

                <button type="button" className="side-nav-modal__menu-item">
                    <span>로그아웃</span>
                </button>
            </nav>
        </>
    );
};

export default MemberNavContent;