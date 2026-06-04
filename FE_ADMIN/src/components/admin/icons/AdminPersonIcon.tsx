const AdminPersonIcon = ({ size = 20 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 11.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5.5 20c.7-3.15 2.9-4.8 6.5-4.8s5.8 1.65 6.5 4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default AdminPersonIcon;
