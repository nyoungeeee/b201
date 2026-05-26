import assert from 'node:assert/strict';

import {
    getJwtUserId,
    resolveAdminAccessToken,
} from '../src/apis/adminApiAuth.ts';

const jwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxfQ.signature';

assert.equal(resolveAdminAccessToken(jwt, null), '');
assert.equal(resolveAdminAccessToken('b201_access_token', 'stored-token'), 'stored-token');
assert.equal(resolveAdminAccessToken(undefined, null), '');
assert.equal(getJwtUserId(jwt), 1);
assert.equal(getJwtUserId('not-a-jwt'), undefined);

console.log('adminApiAuth tests passed');
