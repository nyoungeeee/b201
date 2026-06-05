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
    if (url.endsWith('/me/') && calls.length === 1) {
        return new Response(null, { status: 401 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
}) as typeof fetch;

const response = await authFetch('https://api.b201.kr/v1/me/');

assert.equal(response.status, 200);
assert.equal(calls.length, 3);
assert.equal(calls[0].init?.credentials, 'include');
assert.equal(String(calls[1].input), 'https://api.b201.kr/auth/refresh');
assert.equal(calls[1].init?.method, 'POST');
assert.equal(calls[1].init?.credentials, 'include');
assert.equal(calls[2].init?.credentials, 'include');

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

console.log('authFetch tests passed');
