import type { RoomDayApiResponse } from '../types/calendarSchemas';

export const roomDayMock: RoomDayApiResponse = {
    room_id: 1,
    room_name: 'b201',
    date: '2026-05-23',
    open_time: '09:00',
    close_time: '09:00',
    state: 'RESERVED',
    slot: [
        {
            start_time: '09:00',
            end_time: '10:00',
            name: 'Medicine For Sleep',
            color: 'FF6A2A',
        },
        {
            start_time: '10:00',
            end_time: '10:30',
            name: '실리카겔',
            color: 'FF3B5C',
        },
        {
            start_time: '10:30',
            end_time: '11:00',
            name: '유다빈밴드',
            color: 'C62BFF',
        },
        {
            start_time: '11:00',
            end_time: '12:00',
            name: '브로콜리너마저',
            color: '9DFF2F',
        },
        {
            start_time: '14:00',
            end_time: '15:00',
            name: "Sun'Soo",
            color: '7A00FF',
        },
        {
            start_time: '15:00',
            end_time: '16:00',
            name: "Sun'Soo",
            color: '7A00FF',
        },
        {
            start_time: '16:00',
            end_time: '17:30',
            name: 'ABABA',
            color: 'FFFFFF',
        },
        {
            start_time: '18:30',
            end_time: '20:00',
            name: 'Khris',
            color: 'FFFFFF',
        },
        {
            start_time: '20:00',
            end_time: '21:00',
            name: 'Green Day',
            color: '00E6C3',
        },
        {
            start_time: '21:00',
            end_time: '22:00',
            name: 'Green Day',
            color: '00E6C3',
        },
        {
            start_time: '22:00',
            end_time: '23:00',
            name: 'Green Day',
            color: '00E6C3',
        },
        {
            start_time: '07:00',
            end_time: '08:30',
            name: 'Twenty One Pilots',
            color: 'FFD700',
        }
    ],
};