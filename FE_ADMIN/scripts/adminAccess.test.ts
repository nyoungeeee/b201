import assert from 'node:assert/strict';

import { resolveAdminAccessState } from '../src/utils/adminAccess.ts';

assert.equal(resolveAdminAccessState(null, null), 'signed-out');
assert.equal(resolveAdminAccessState('access-token', null), 'checking');
assert.equal(resolveAdminAccessState('access-token', true), 'allowed');
assert.equal(resolveAdminAccessState('access-token', false), 'forbidden');

console.log('adminAccess tests passed');
