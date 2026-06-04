const AdminCalendarIcon = ({ size = 22 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3v3M17 3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path
        d="M4.5 8.2h15M6 5h12c.83 0 1.5.67 1.5 1.5v12c0 .83-.67 1.5-1.5 1.5H6c-.83 0-1.5-.67-1.5-1.5v-12C4.5 5.67 5.17 5 6 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AdminCalendarIcon;
