import assert from 'node:assert/strict';

import { hasAdminAccess } from '../src/apis/adminAccessResponse.ts';

assert.equal(hasAdminAccess({ ok: true, data: { is_staff: true } }), true);
assert.equal(hasAdminAccess({ ok: true, data: { is_staff: false } }), false);
assert.equal(hasAdminAccess({ is_staff: true }), false);

console.log('adminAccessResponse tests passed');
