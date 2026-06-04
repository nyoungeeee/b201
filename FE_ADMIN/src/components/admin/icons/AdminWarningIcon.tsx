const AdminWarningIcon = ({ size = 26 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.72 4.45 2.9 18.1A1.6 1.6 0 0 0 4.28 20.5h15.44a1.6 1.6 0 0 0 1.38-2.4L13.28 4.45a1.48 1.48 0 0 0-2.56 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M12 9v4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
};

export default AdminWarningIcon;
