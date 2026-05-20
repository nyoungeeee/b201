const AdminRepeatIcon = ({ size = 24 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M17 4.5 20.5 8 17 11.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 8h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M7 19.5 3.5 16 7 12.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20 16H4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
};

export default AdminRepeatIcon;
