export const isMobileLikeDevice = (
    userAgent = navigator.userAgent,
    matchMedia = window.matchMedia.bind(window),
) => {
    const hasCoarsePointer = matchMedia('(hover: none) and (pointer: coarse)').matches;
    const hasMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    return hasCoarsePointer || hasMobileUserAgent;
};
