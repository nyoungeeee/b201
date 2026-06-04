const AdminRoomIcon = ({ size = 31 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 20.5V4.6c0-.6.48-1.1 1.08-1.1h8.84c.6 0 1.08.5 1.08 1.1v15.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M4 20.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 8h4M9 11.5h4M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 8h1.4c.6 0 1.1.5 1.1 1.1v11.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
};

export default AdminRoomIcon;
