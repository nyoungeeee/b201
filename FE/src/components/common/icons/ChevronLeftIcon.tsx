const BackArrowIcon = ({
    size = 30,
    color = 'currentColor',
}: {
    size?: number;
    color?: string;
}) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            style={{ display: 'block', color }}
        >
            <path
                d="M15 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default BackArrowIcon;