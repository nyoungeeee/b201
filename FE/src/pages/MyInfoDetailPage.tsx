import { useNavigate } from "react-router-dom";
import { ChevronRightIcon } from "../components/common/icons";
import MobilePageLayout from "../components/layout/MobilePageLayout";
import PageSubHeader from "../components/layout/PageSubHeader";

const MyInfoDetailPage = () => {
    const navigate = useNavigate();

    const user = {
        email: "testkakaoemail@kakao.com",
        provider: "kakao",
        nickname: "",
    };

    return (
        <MobilePageLayout>
            <PageSubHeader />

            <main className="my-info-page">
                <section className="my-info-detail-page__profile">
                    <h1 className="my-info-page__title">내 정보 확인</h1>
                    <p className="my-info-page__label">
                        현재 로그인한 계정에 대한 <br />
                        SNS 연동 정보를 확인할 수 있어요.
                    </p>
                </section>

                <div className="my-info-page__divider" />

                <section className="my-info-menu">
                    <div className="my-info-detail__row">
                        <span className="my-info-detail__label">연동 SNS</span>

                        <div className="my-info-detail__value my-info-detail__value--sns">
                            <img
                                src="/icons/kakao.png"
                                alt=""
                                className="my-info-detail__sns-icon"
                            />
                            <span>{user.provider}</span>
                        </div>
                    </div>

                    <div className="my-info-detail__row">
                        <span className="my-info-detail__label">SNS 계정</span>
                        <span className="my-info-detail__value">
                            {user.email}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="my-info-menu__item"
                        onClick={() => navigate("/policy/terms")}
                    >
                        <span>서비스 이용약관</span>
                        <span className="my-info-menu__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="my-info-menu__item"
                        onClick={() => navigate("/policy/privacy")}
                    >
                        <span>개인정보 처리방침</span>
                        <span className="my-info-menu__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>

                    <button
                        type="button"
                        className="my-info-menu__item"
                        onClick={() => navigate("/my/withdraw")}
                    >
                        <span>회원탈퇴</span>
                        <span className="my-info-menu__arrow">
                            <ChevronRightIcon />
                        </span>
                    </button>
                </section>
            </main>
        </MobilePageLayout>
    );
};

export default MyInfoDetailPage;