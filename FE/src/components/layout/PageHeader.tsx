import logo from "../../assets/B201_header_logo.png";
type Props = {
    title: string;
};

const PageHeader = ({ title }: Props) => {
    return (
        <div className="page-header">
            <div className="page-header__logo">
                <img src={logo} alt="logo" />
            </div>
            <h1 className="page-header__title">{title}</h1>
        </div>
    );
};

export default PageHeader;