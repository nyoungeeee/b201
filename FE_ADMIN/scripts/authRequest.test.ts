import assert from 'node:assert/strict';

import { buildSigninRequestBody } from '../src/apis/authRequest.ts';

assert.deepEqual(
    buildSigninRequestBody(
        'code-123',
        'https://admin.b201.kr/auth/kakao/callback',
    ),
    {
        kakao_auth_code: 'code-123',
        redirect_uri: 'https://admin.b201.kr/auth/kakao/callback',
    },
);

console.log('authRequest tests passed');
