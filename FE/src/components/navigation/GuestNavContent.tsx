import logo from "../../assets/B201_logo.png";

const GuestNavContent = () => {
    return (
        <>
            <div className="side-nav-modal__logo side-nav-modal__logo--guest">
                <img src={logo} alt="B201" />
            </div>

            <button type="button" className="side-nav-modal__login">
                <span className="side-nav-modal__kakao-icon" />
                카카오 계정으로 로그인하기
            </button>

            <div className="side-nav-modal__divider" />

            <nav className="side-nav-modal__menu">
                <button type="button" className="side-nav-modal__menu-item">
                    <span>예약 현황</span>
                </button>
            </nav>
        </>
    );
};

export default GuestNavContent;