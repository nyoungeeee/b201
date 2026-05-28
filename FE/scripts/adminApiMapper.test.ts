import assert from 'node:assert/strict';

import {
    toAffectedReservation,
    toConflict,
    toDayOff,
    toReservation,
    toRoom,
    toTeam,
    toUser,
    unwrapAdminResponse,
} from '../src/apis/adminApiMapper.ts';

const today = new Date('2026-05-22T00:00:00');

assert.deepEqual(
    unwrapAdminResponse({
        ok: true,
        data: [{ id: 1 }],
        pagination: { page: 1 },
    }),
    [{ id: 1 }],
);

assert.throws(
    () =>
        unwrapAdminResponse({
            ok: false,
            error_code: 'DUPLICATE_TEAM_NAME',
            message: '이미 존재하는 팀 이름입니다.',
        }),
    /이미 존재하는 팀 이름입니다/,
);

assert.deepEqual(
    toReservation(
        {
            id: 10,
            status: 'approved',
            kind: 'single',
            room_id: 1,
            room_name: 'A룸',
            date: '2026-05-24',
            start_time: '10:00:00',
            end_time: '12:00:00',
            end_next_day: false,
            team_id: 1,
            team_name: 'B201 밴드',
            reserver_user_id: 2,
            name: 'B201 밴드',
            reserver_name: '홍길동',
            memo: '',
            repeat_weekdays: null,
            repeat_start_date: null,
            repeat_end_date: null,
            canceled_occurrence_dates: [],
        },
        today,
        2,
    ),
    {
        id: 10,
        status: 'approved',
        kind: 'single',
        dateLabel: '05.24 (일)',
        dayOffset: 2,
        timeLabel: '10:00~12:00',
        periodLabel: undefined,
        room: 'A룸',
        roomId: 1,
        teamId: 1,
        teamName: 'B201 밴드',
        reserverUserId: 2,
        reserverName: '사장님',
        memo: undefined,
        canceledOccurrenceDates: [],
    },
);

assert.equal(
    toReservation(
        {
            id: 11,
            status: 'pending',
            kind: 'single',
            room_id: 1,
            room_name: 'A룸',
            date: '2026-05-24',
            start_time: '10:00:00',
            end_time: '12:00:00',
            end_next_day: false,
            team_id: 1,
            team_name: '새소년단',
            reserver_user_id: 6,
            name: '새소년단',
            reserver_name: '민지',
            memo: '',
            repeat_weekdays: null,
            repeat_start_date: null,
            repeat_end_date: null,
            canceled_occurrence_dates: [],
        },
        today,
    ).reserverName,
    '민지',
);

assert.deepEqual(
    toUser(
        {
            id: 1,
            nickname: null,
            email: null,
            status: 'normal',
            joined_at: '2026-05-22',
            team_ids: [1, 2],
        },
        1,
    ),
    {
        id: 1,
        nickname: '사장님',
        email: '',
        status: 'normal',
        joinedAt: '2026.05.22',
        teams: [1, 2],
    },
);

assert.deepEqual(
    toTeam({
        id: 1,
        name: 'B201 밴드',
        color_id: 3,
        color_value: '#FF6B6B',
        leader_id: 0,
        leader_nickname: null,
        member_count: 1,
        updated_at: '2026-05-22',
        member_ids: [2],
    }),
    {
        id: 1,
        name: 'B201 밴드',
        colorId: '3',
        leaderId: 0,
        memberIds: [2],
        updatedAt: '2026.05.22',
    },
);

assert.deepEqual(
    toRoom({
        id: 1,
        name: 'A룸',
        description: null,
        open_time: '09:00:00',
        close_time: '23:00:00',
        is_open_all_day: false,
        is_active: true,
        sort_order: 1,
        updated_at: '2026-05-22',
    }),
    {
        id: 1,
        name: 'A룸',
        description: '',
        openTime: '09:00',
        closeTime: '23:00',
        isOpenAllDay: false,
        isActive: true,
        sortOrder: 1,
        updatedAt: '2026.05.22',
    },
);

assert.deepEqual(
    toDayOff({
        id: 1,
        room_id: null,
        room_name: '전체 합주실',
        type: '휴무',
        start_date: '2026-05-22',
        end_date: '2026-05-24',
        start_time: null,
        end_time: null,
        is_all_day: true,
        reason: null,
        created_at: '2026-05-22T09:00:00Z',
    }),
    {
        id: 1,
        roomName: '전체 합주실',
        dateLabel: '2026.05.22 ~ 2026.05.24',
        timeLabel: '하루전체',
        type: '휴무',
        reason: '사유 없음',
    },
);

assert.deepEqual(
    toConflict({
        id: 9,
        room_id: 1,
        room_name: 'A룸',
        date: '2026-05-22',
        start_time: '10:30:00',
        end_time: '11:30:00',
        end_next_day: false,
        owner_label: 'B201 밴드',
        status: 'approved',
    }),
    {
        id: 9,
        room: 'A룸',
        roomId: 1,
        date: '2026.05.22',
        timeLabel: '10:30~11:30',
        ownerLabel: 'B201 밴드',
        status: 'approved',
    },
);

assert.deepEqual(
    toAffectedReservation({
        id: 9,
        room_id: 1,
        room_name: 'A룸',
        date: '2026-05-22',
        start_time: '10:30:00',
        end_time: '11:30:00',
        end_next_day: false,
        owner_label: 'B201 밴드',
        status: 'pending',
    }),
    {
        id: 9,
        roomName: 'A룸',
        dateTime: '2026.05.22 10:30~11:30',
        reserver: 'B201 밴드',
        status: '승인 대기',
    },
);

console.log('adminApiMapper tests passed');
