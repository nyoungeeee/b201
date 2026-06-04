const AdminTeamIcon = ({ size = 20 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16.5 10.5a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.8 19c.58-3.05 2.35-4.65 5.2-4.65s4.62 1.6 5.2 4.65" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M14.2 14.4c2.85.18 4.6 1.72 5.1 4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
};

export default AdminTeamIcon;
