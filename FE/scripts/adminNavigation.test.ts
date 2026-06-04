import assert from 'node:assert/strict';

import { getAdminHomeUrl } from '../src/utils/adminNavigation.ts';

assert.equal(getAdminHomeUrl('https://admin.b201.kr/'), 'https://admin.b201.kr');
assert.equal(getAdminHomeUrl('https://admin.b201.kr'), 'https://admin.b201.kr');

console.log('adminNavigation tests passed');
