import assert from 'node:assert/strict';

import { authFetch } from '../src/apis/authFetch.ts';
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../src/constants/env.ts';

const storage = new Map<string, string>();
globalThis.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
        storage.set(key, value);
    },
    removeItem: (key: string) => {
        storage.delete(key);
    },
    clear: () => storage.clear(),
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
        return storage.size;
    },
} as Storage;

const calls: Array<{ input: string | URL | Request; init?: RequestInit }> = [];

globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    calls.push({ input, init });

    const url = String(input);
    if (url.endsWith('/auth/csrf')) {
        return new Response(JSON.stringify({ csrfToken: 'csrf-token' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
    if (url.endsWith('/me/') && calls.length === 1) {
        return new Response(null, { status: 401 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
}) as typeof fetch;

const response = await authFetch('https://api.b201.kr/v1/me/');

assert.equal(response.status, 200);
assert.equal(calls.length, 4);
assert.equal(calls[0].init?.credentials, 'include');
assert.equal(String(calls[1].input), 'https://api.b201.kr/auth/csrf');
assert.equal(calls[1].init?.credentials, 'include');
assert.equal(String(calls[2].input), 'https://api.b201.kr/auth/refresh');
assert.equal(calls[2].init?.method, 'POST');
assert.equal(calls[2].init?.credentials, 'include');
assert.equal(
    new Headers(calls[2].init?.headers).get('X-CSRFToken'),
    'csrf-token',
);
assert.equal(calls[3].init?.credentials, 'include');

calls.length = 0;
storage.set(ACCESS_TOKEN_KEY, 'old-access');
storage.set(REFRESH_TOKEN_KEY, 'old-refresh');

globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    calls.push({ input, init });

    return new Response(null, { status: 401 });
}) as typeof fetch;

await authFetch('https://api.b201.kr/v1/me/');

assert.equal(localStorage.getItem(ACCESS_TOKEN_KEY), null);
assert.equal(localStorage.getItem(REFRESH_TOKEN_KEY), null);

calls.length = 0;
let refreshCalls = 0;
let releaseRefresh: (() => void) | undefined;
const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
});

globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
) => {
    calls.push({ input, init });
    const url = String(input);

    if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await refreshGate;
        return new Response(null, { status: 200 });
    }

    const requestAttempts = calls.filter(
        (call) => String(call.input) === url,
    ).length;
    return new Response(null, { status: requestAttempts === 1 ? 401 : 200 });
}) as typeof fetch;

const firstRequest = authFetch('https://api.b201.kr/v1/me/');
const secondRequest = authFetch('https://api.b201.kr/v1/teams/');
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(refreshCalls, 1);
releaseRefresh?.();

const concurrentResponses = await Promise.all([firstRequest, secondRequest]);
assert.deepEqual(
    concurrentResponses.map((concurrentResponse) => concurrentResponse.status),
    [200, 200],
);
assert.equal(refreshCalls, 1);

console.log('authFetch tests passed');
