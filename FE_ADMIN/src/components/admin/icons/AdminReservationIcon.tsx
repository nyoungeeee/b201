const AdminReservationIcon = ({ size = 31 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M9.2 3.5h5.6c.45 0 .8.36.8.8v1.9c0 .45-.35.8-.8.8H9.2a.8.8 0 0 1-.8-.8V4.3c0-.44.35-.8.8-.8Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 5.5H5.8c-.72 0-1.3.58-1.3 1.3v12.4c0 .72.58 1.3 1.3 1.3h12.4c.72 0 1.3-.58 1.3-1.3V6.8c0-.72-.58-1.3-1.3-1.3H17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

export default AdminReservationIcon;
