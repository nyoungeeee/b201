// components/common/icons/LockIcon.tsx

interface LockIconProps {
    size?: number;
    color?: string;
    keyholeColor?: string;
}

const LockIcon = ({
    size = 12,
    color = '#FFFFFF',
    keyholeColor = '#24211F',
}: LockIconProps) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M8 10V7.5C8 5.29086 9.79086 3.5 12 3.5C14.2091 3.5 16 5.29086 16 7.5V10"
                stroke={color}
                strokeWidth="2.2"
                strokeLinecap="round"
            />

            <rect
                x="5"
                y="10"
                width="14"
                height="11"
                rx="3"
                fill={color}
            />

            <circle
                cx="12"
                cy="15.5"
                r="1.7"
                fill={keyholeColor}
            />
        </svg>
    );
};

export default LockIcon;