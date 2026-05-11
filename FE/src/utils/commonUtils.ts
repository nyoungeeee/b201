import { MAX_LENGTH } from "../constants/global";
const KOREAN_REGEX = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

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

    // 한글 완성형/자모, 영문, 숫자만 허용
    if (/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value)) return false;

    return getNicknameLength(value) <= MAX_LENGTH;
};

