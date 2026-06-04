const AdminMemoIcon = ({ size = 24 }: { size?: number }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 5h11c.83 0 1.5.67 1.5 1.5v7.8c0 .83-.67 1.5-1.5 1.5H12l-4.2 3.4v-3.4H6.5c-.83 0-1.5-.67-1.5-1.5V6.5C5 5.67 5.67 5 6.5 5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M8.6 9h6.8M8.6 12.2h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
};

export default AdminMemoIcon;
