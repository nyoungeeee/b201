import assert from 'node:assert/strict';

import { isMobileLikeDevice } from '../src/utils/deviceUtils.ts';

const createMatchMedia = (matches: boolean) => () => ({ matches });

assert.equal(
    isMobileLikeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        createMatchMedia(false),
    ),
    true,
);

assert.equal(
    isMobileLikeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createMatchMedia(true),
    ),
    true,
);

assert.equal(
    isMobileLikeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        createMatchMedia(false),
    ),
    false,
);

console.log('deviceUtils tests passed');
