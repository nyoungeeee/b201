import assert from 'node:assert/strict';

import {
    authFetch,
    logoutWithCookie,
    refreshWithCookie,
} from '../src/apis/authFetch.ts';

const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];

globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    calls.push({ input, init });

    if (String(input).endsWith('/auth/csrf')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(null, { status: 200 });
}) as typeof fetch;

await logoutWithCookie();

assert.equal(calls.length, 2);
assert.equal(String(calls[0].input), 'https://api.b201.kr/auth/csrf');
assert.equal(calls[0].init?.credentials, 'include');
assert.equal(String(calls[1].input), 'https://api.b201.kr/auth/logout');
assert.equal(new Headers(calls[1].init?.headers).get('X-CSRFToken'), 'csrf-token');

calls.length = 0;
await authFetch('https://api.b201.kr/v1/me/', { method: 'PATCH' });

assert.equal(calls.length, 1);
assert.equal(new Headers(calls[0].init?.headers).get('X-CSRFToken'), 'csrf-token');

calls.length = 0;
await refreshWithCookie();

assert.equal(calls.length, 1);
assert.equal(String(calls[0].input), 'https://api.b201.kr/auth/refresh');
assert.equal(new Headers(calls[0].init?.headers).get('X-CSRFToken'), 'csrf-token');

console.log('csrfFetch tests passed');
