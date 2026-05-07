import { useMemo } from "react";
import { useParams } from "react-router-dom";
import MobilePageLayout from "../components/layout/MobilePageLayout";
import PageSubHeader from "../components/layout/PageSubHeader";
import { PRIVACY_CONTENT, TERMS_CONTENT } from "../constants/terms";
import "../styles/terms.css";

type PolicyType = "terms" | "privacy";

const POLICY_META: Record<
    PolicyType,
    {
        title: string;
        description: string;
        content: string;
    }
> = {
    terms: {
        title: "서비스 이용약관",
        description: "B201  합주실 예약 서비스 이용에 대한 규정을 확인할 수 있어요.",
        content: TERMS_CONTENT,
    },
    privacy: {
        title: "개인정보 처리방침",
        description: `우리 서비스는 정보통신망 이용촉진, 개인정보보호법 등의 국내의 개인정보 보호 법령을 철저히 준수해요.`,
        content: PRIVACY_CONTENT,
    },
};

const PolicyPage = () => {
    const { type } = useParams<{ type: PolicyType }>();

    const policy = useMemo(() => {
        if (type !== "terms" && type !== "privacy") {
            return POLICY_META.terms;
        }
        return POLICY_META[type];
    }, [type]);

    return (
        <MobilePageLayout>
            <PageSubHeader />
            <main className="policy-page">
                <section className="policy-page__header">
                    <h1 className="policy__title">{policy.title}</h1>
                    <p className="policy__label">
                        {policy.description}
                    </p>
                </section>

                <div className="policy__divider" />

                <section className="policy-content">
                    <p className="policy-content__text">
                        {policy.content}
                    </p>
                </section>
            </main>
        </MobilePageLayout>
    );
};

export default PolicyPage;