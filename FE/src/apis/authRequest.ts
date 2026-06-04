export const buildSigninRequestBody = (
    kakaoAuthCode: string,
    redirectUri: string,
) => ({
    kakao_auth_code: kakaoAuthCode,
    redirect_uri: redirectUri,
});
