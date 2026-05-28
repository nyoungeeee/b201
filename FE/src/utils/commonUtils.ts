import { MAX_LENGTH } from '../constants/global';

const KOREAN_REGEX = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
const NICKNAME_INVALID_CHARACTER_REGEX = /[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/;
const KOREAN_SYLLABLE_START = 0xac00;
const KOREAN_SYLLABLE_END = 0xd7a3;
const JONGSUNG_COUNT = 28;

export const getNicknameLength = (value: string) => {
    let length = 0;

    for (const char of value) {
        if (KOREAN_REGEX.test(char)) {
            length += 1;
        } else {
            length += 8 / 16;
        }
    }

    return length;
};

export const isValidNickname = (value: string) => {
    if (!value) return false;

    if (NICKNAME_INVALID_CHARACTER_REGEX.test(value)) return false;

    return getNicknameLength(value) <= MAX_LENGTH;
};

export const getObjectParticle = (value: string) => {
    const lastChar = value.trim().at(-1);

    if (!lastChar) return '을/를';

    const charCode = lastChar.charCodeAt(0);

    if (
        charCode < KOREAN_SYLLABLE_START ||
        charCode > KOREAN_SYLLABLE_END
    ) {
        return '을/를';
    }

    const normalizedCharCode = charCode - KOREAN_SYLLABLE_START;
    const hasFinalConsonant =
        normalizedCharCode % JONGSUNG_COUNT !== 0;

    return hasFinalConsonant ? '을' : '를';
};
