const QuestionCircleIcon = ({
    size = 16,
    color = 'var(--accent-primary)',
}: {
    size?: number;
    color?: string;
}) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ display: 'block' }}
    >
        <circle cx="12" cy="12" r="10" fill={color} />
        <path
            d="M9.7 9.2a2.5 2.5 0 1 1 3.4 2.34c-.72.3-1.1.75-1.1 1.46v.25"
            stroke="var(--text-inverse)"
            strokeWidth="2"
            strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.15" fill="var(--text-inverse)" />
    </svg>
);

export default QuestionCircleIcon;
