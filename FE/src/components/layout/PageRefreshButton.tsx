import RefreshIcon from '../common/icons/RefreshIcon';

interface PageRefreshButtonProps {
    isRefreshing?: boolean;
    onRefresh: () => void | Promise<unknown>;
}

const PageRefreshButton = ({
    isRefreshing = false,
    onRefresh,
}: PageRefreshButtonProps) => (
    <button
        type="button"
        className={[
            'page-sub-header__refresh-button',
            isRefreshing ? 'is-refreshing' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => void onRefresh()}
        aria-label="새로고침"
        disabled={isRefreshing}
    >
        <RefreshIcon />
    </button>
);

export default PageRefreshButton;
