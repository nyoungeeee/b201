import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    checkRepeatReservation,
    createReservation,
    type RepeatConflictOccurrence,
} from '../apis/reservationApi';
import InfoCircleIcon from '../components/common/icons/InfoCircleIcon';
import MobilePageLayout from '../components/layout/MobilePageLayout';
import PageSubHeader from '../components/layout/PageSubHeader';
import ReservationRepeatPicker, {
    type RepeatOption,
} from '../components/reservation/ReservationRepeatPicker';
import ReservationStartTimePicker, {
    type Meridiem,
    type TimeWheelOption,
} from '../components/reservation/ReservationStartTimePicker';
import ReservationStepTabs, {
    type ReservationStep,
    type ReservationStepKey,
} from '../components/reservation/ReservationStepTabs';
import ReservationTeamPicker, {
    type ReservationTeamOption,
} from '../components/reservation/ReservationTeamPicker';
import { DEFAULT_ROOM_ID, WEEK_DAYS } from '../constants/global';
import {
    CALENDAR_TEXT,
    RESERVATION_APPLY_TEXT,
    RESERVATION_COMMON_TEXT,
} from '../domains/reservation/constants';
import {
    getReservationEndAt,
    mapReservationListItem,
} from '../domains/reservation/mapper';
import { mapCreatedRepeatRounds } from '../domains/reservation/repeatRounds';
import type { MyReservation } from '../domains/reservation/types';
import { reservationQueryKeys } from '../hooks/queries/useReservations';
import { useRoomDay } from '../hooks/queries/useRoomDay';
import { useRoomMonth } from '../hooks/queries/useRoomMonth';
import { useRefreshAuthUser } from '../hooks/useRefreshAuthUser';
import { useAuthSession } from '../hooks/useAuthSession';
import { queryClient } from '../lib/queryClient';
import {
    addDays,
    formatDateString,
    getDateDistance,
    isValidDateString,
    parseDateString,
} from '../utils/dateTimeUtils';
import {
    DAY_SLOT_COUNT,
    getOperatingSlotRange,
    getSlotRange,
    hasBlockedSlotOverlap,
    isOutsideOperatingHours,
    isStartSlotInsideOperatingHours,
    TIME_SLOT_INTERVAL_MINUTES,
} from '../utils/reservationSlotUtils';
import { getTodayInSeoul } from '../utils/timelineUtils';

interface CalendarDay {
    fullDate: string;
    date: number;
    isCurrentMonth: boolean;
    isSunday: boolean;
    isSaturday: boolean;
}

const KOREAN_WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TIME_PICKER_VISIBLE_RANGE = 3;
const INITIAL_START_ABSOLUTE_SLOT = 46;
const DEFAULT_DURATION_SLOT_COUNT = 4;
const STEP_ORDER: ReservationStepKey[] = ['date', 'startTime', 'endTime', 'repeat', 'type'];
const REPEAT_OPTIONS: RepeatOption[] = [
    { label: RESERVATION_APPLY_TEXT.noRepeat, value: 0 },
    ...Array.from({ length: 11 }, (_, index) => ({
        label: `${index + 2}주`,
        value: index + 2,
    })),
];
const PRIVATE_TEAM_OPTION: ReservationTeamOption = {
    label: RESERVATION_APPLY_TEXT.privatePractice,
    value: 'private',
};

const formatStepDate = (dateString: string) => {
    const { month, date } = parseDateString(dateString);

    return `${String(month).padStart(2, '0')}.${String(date).padStart(2, '0')}`;
};

const formatHeaderDate = (dateString: string) => {
    const { year, month, date } = parseDateString(dateString);
    const day = new Date(year, month - 1, date).getDay();

    return `${year}.${String(month).padStart(2, '0')}.${String(date).padStart(2, '0')}(${KOREAN_WEEK_DAYS[day]})`;
};

const formatDayLabel = (dateString: string) => {
    const { date } = parseDateString(dateString);

    return `${date}일`;
};

const formatTimeLabel = (minutes: number) => {
    const hour = Math.floor((minutes % 720) / 60);
    const minute = minutes % 60;
    const displayHour = hour === 0 ? 12 : hour;

    return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const getMeridiem = (minutes: number): Meridiem => {
    return minutes < 720 ? '오전' : '오후';
};

const formatCompactTime = (absoluteSlot: number) => {
    const { minutes } = parseSlotKey(getSlotKey(absoluteSlot));
    const hour24 = Math.floor(minutes / 60);
    const minute = minutes % 60;

    return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const formatEndSummaryTime = (
    startAbsoluteSlot: number,
    endAbsoluteSlot: number,
) => {
    const startOffset = Math.floor(startAbsoluteSlot / 48);
    const endOffset = Math.floor(endAbsoluteSlot / 48);
    const dayDiff = endOffset - startOffset;

    if (dayDiff === 1) {
        return `다음날 ${formatCompactTime(endAbsoluteSlot)}`;
    }

    if (dayDiff === -1) {
        return `전날 ${formatCompactTime(endAbsoluteSlot)}`;
    }

    if (dayDiff > 1) {
        return `${dayDiff}일 후 ${formatCompactTime(endAbsoluteSlot)}`;
    }

    if (dayDiff < -1) {
        return `${Math.abs(dayDiff)}일 전 ${formatCompactTime(endAbsoluteSlot)}`;
    }

    return formatCompactTime(endAbsoluteSlot);
};

const formatDurationLabel = (
    startAbsoluteSlot: number,
    endAbsoluteSlot: number,
) => {
    const durationMinutes =
        (endAbsoluteSlot - startAbsoluteSlot) * TIME_SLOT_INTERVAL_MINUTES;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
        return `${hours}시간 ${minutes}분`;
    }

    if (hours > 0) {
        return `${hours}시간`;
    }

    return `${minutes}분`;
};

const formatRepeatLabel = (value: number) => {
    if (value === 0) return RESERVATION_APPLY_TEXT.noRepeat;

    return `${value}주 반복`;
};

const formatTeamLabel = (
    options: ReservationTeamOption[],
    value: string,
) => {
    return options.find((option) => option.value === value)?.label
        ?? RESERVATION_APPLY_TEXT.privatePractice;
};

const formatTeamStepLabel = (value: string) => {
    return value === 'private'
        ? RESERVATION_APPLY_TEXT.privatePracticeCompact
        : RESERVATION_APPLY_TEXT.teamPractice;
};

const getSlotKey = (absoluteSlot: number) => {
    const dateOffset = Math.floor(absoluteSlot / 48);
    const timeSlot = ((absoluteSlot % 48) + 48) % 48;
    const minutes = timeSlot * TIME_SLOT_INTERVAL_MINUTES;

    return `${dateOffset}:${minutes}`;
};

const parseSlotKey = (key: string) => {
    const [dateOffset, minutes] = key.split(':').map(Number);

    return { dateOffset, minutes };
};

const parseAbsoluteSlot = (key: string) => {
    const { dateOffset, minutes } = parseSlotKey(key);

    return dateOffset * 48 + minutes / TIME_SLOT_INTERVAL_MINUTES;
};

const formatTimeForApi = (absoluteSlot: number) => {
    return `${formatCompactTime(absoluteSlot)}:00`;
};

const parseTeamId = (value: string) => {
    if (value === 'private') return undefined;

    const id = Number(value.replace('team:', ''));

    return Number.isFinite(id) ? id : undefined;
};

const formatRepeatConflictDate = (occurrence: RepeatConflictOccurrence) => {
    const { month, date } = parseDateString(occurrence.date);

    return `[${occurrence.week}회차] ${String(month).padStart(2, '0')}.${String(date).padStart(2, '0')}`;
};

const createTemporaryReservation = (
    response: Awaited<ReturnType<typeof createReservation>>,
    repeat: boolean,
): MyReservation | null => {
    const firstReservation = response.reservations[0];

    if (!firstReservation) return null;

    const lastReservation = response.reservations[response.reservations.length - 1];

    return mapReservationListItem(firstReservation, {
        isRepeat: repeat,
        repeatEndAt: repeat
            ? getReservationEndAt(lastReservation)
            : undefined,
        conflictCount: response.skipped_occurrences?.length,
    });
};

const getMinimumStartAbsoluteSlot = (baseDate: string) => {
    const now = new Date();
    const todayDate = getTodayInSeoul();
    const todayOffset = getDateDistance(baseDate, todayDate);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const nextSlot = Math.ceil(currentMinutes / TIME_SLOT_INTERVAL_MINUTES);

    return todayOffset * 48 + nextSlot;
};

const getInitialDate = (preferredDate?: string | null) => {
    const todayDate = getTodayInSeoul();

    if (isValidDateString(preferredDate) && preferredDate >= todayDate) {
        return preferredDate;
    }

    return todayDate;
};

const getInitialStartAbsoluteSlot = (baseDate: string) => {
    return Math.max(INITIAL_START_ABSOLUTE_SLOT, getMinimumStartAbsoluteSlot(baseDate));
};

const getFirstVisibleAbsoluteSlot = (
    isVisible: (absoluteSlot: number) => boolean,
    minimumAbsoluteSlot = 0,
) => {
    for (let absoluteSlot = minimumAbsoluteSlot; absoluteSlot < DAY_SLOT_COUNT * 14; absoluteSlot += 1) {
        if (isVisible(absoluteSlot)) return absoluteSlot;
    }

    return minimumAbsoluteSlot;
};

const getFirstAvailableAbsoluteSlot = (
    isVisible: (absoluteSlot: number) => boolean,
    isReserved: (key: string, absoluteSlot: number) => boolean,
    minimumAbsoluteSlot = 0,
) => {
    for (let absoluteSlot = minimumAbsoluteSlot; absoluteSlot < DAY_SLOT_COUNT * 14; absoluteSlot += 1) {
        if (
            isVisible(absoluteSlot) &&
            !isReserved(getSlotKey(absoluteSlot), absoluteSlot)
        ) {
            return absoluteSlot;
        }
    }

    return getFirstVisibleAbsoluteSlot(isVisible, minimumAbsoluteSlot);
};

const createStartTimeSlot = (
    baseDate: string,
    absoluteSlot: number,
    isReserved: (key: string, absoluteSlot: number) => boolean,
): TimeWheelOption => {
    const key = getSlotKey(absoluteSlot);
    const { dateOffset, minutes } = parseSlotKey(key);

    return {
        key,
        label: formatTimeLabel(minutes),
        dateLabel: formatDayLabel(addDays(baseDate, dateOffset)),
        meridiem: getMeridiem(minutes),
        reserved: isReserved(key, absoluteSlot),
    };
};

const getVisibleTimeOptions = (
    baseDate: string,
    selectedAbsoluteSlot: number,
    isReserved: (key: string, absoluteSlot: number) => boolean,
) => {
    return Array.from(
        { length: TIME_PICKER_VISIBLE_RANGE * 2 + 1 },
        (_, index) => createStartTimeSlot(
            baseDate,
            selectedAbsoluteSlot - TIME_PICKER_VISIBLE_RANGE + index,
            isReserved,
        ),
    );
};

const getClosestVisibleAbsoluteSlot = (
    absoluteSlot: number,
    isVisible: (value: number) => boolean,
) => {
    if (isVisible(absoluteSlot)) return absoluteSlot;

    for (let distance = 1; distance <= 144; distance += 1) {
        const nextAbsoluteSlot = absoluteSlot + distance;
        const previousAbsoluteSlot = absoluteSlot - distance;

        if (isVisible(nextAbsoluteSlot)) return nextAbsoluteSlot;
        if (isVisible(previousAbsoluteSlot)) return previousAbsoluteSlot;
    }

    return absoluteSlot;
};

const getNextAvailableAbsoluteSlot = (
    currentAbsoluteSlot: number,
    direction: -1 | 1,
    isReserved: (key: string, absoluteSlot: number) => boolean,
    isVisible: (absoluteSlot: number) => boolean = () => true,
) => {
    let nextAbsoluteSlot = currentAbsoluteSlot + direction;
    let guard = 0;

    while (guard < DAY_SLOT_COUNT * 14) {
        if (
            isVisible(nextAbsoluteSlot) &&
            !isReserved(getSlotKey(nextAbsoluteSlot), nextAbsoluteSlot)
        ) {
            return nextAbsoluteSlot;
        }

        nextAbsoluteSlot += direction;
        guard += 1;
    }

    return currentAbsoluteSlot;
};

const getMeridiemAbsoluteSlot = (
    currentKey: string,
    nextMeridiem: Meridiem,
    isReserved: (key: string, absoluteSlot: number) => boolean,
    isVisible: (absoluteSlot: number) => boolean = () => true,
) => {
    const { dateOffset, minutes } = parseSlotKey(currentKey);
    const twelveHourMinutes = minutes % 720;
    const nextMinutes = nextMeridiem === '오전'
        ? twelveHourMinutes
        : twelveHourMinutes + 720;
    const nextKey = `${dateOffset}:${nextMinutes}`;
    const nextAbsoluteSlot = parseAbsoluteSlot(nextKey);

    if (!isVisible(nextAbsoluteSlot) || isReserved(nextKey, nextAbsoluteSlot)) {
        return getNextAvailableAbsoluteSlot(nextAbsoluteSlot, 1, isReserved, isVisible);
    }

    return nextAbsoluteSlot;
};

const normalizeAbsoluteSlotDate = (baseDate: string, absoluteSlot: number) => {
    const dateOffset = Math.floor(absoluteSlot / 48);

    return {
        date: addDays(baseDate, dateOffset),
        absoluteSlot: absoluteSlot - dateOffset * 48,
    };
};

const getCalendarDays = (year: number, month: number): CalendarDay[] => {
    const firstDay = new Date(year, month - 1, 1);
    const firstDayWeek = firstDay.getDay();
    const lastDate = new Date(year, month, 0).getDate();
    const previousMonthLastDate = new Date(year, month - 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let index = firstDayWeek - 1; index >= 0; index -= 1) {
        const previousMonthDate = new Date(
            year,
            month - 2,
            previousMonthLastDate - index,
        );

        days.push({
            fullDate: formatDateString(
                previousMonthDate.getFullYear(),
                previousMonthDate.getMonth() + 1,
                previousMonthDate.getDate(),
            ),
            date: previousMonthDate.getDate(),
            isCurrentMonth: false,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
        });
    }

    for (let date = 1; date <= lastDate; date += 1) {
        days.push({
            fullDate: formatDateString(year, month, date),
            date,
            isCurrentMonth: true,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
        });
    }

    const totalCells = days.length <= 35 ? 35 : 42;
    const remainingCells = totalCells - days.length;

    for (let date = 1; date <= remainingCells; date += 1) {
        const nextMonthDate = new Date(year, month, date);

        days.push({
            fullDate: formatDateString(
                nextMonthDate.getFullYear(),
                nextMonthDate.getMonth() + 1,
                nextMonthDate.getDate(),
            ),
            date: nextMonthDate.getDate(),
            isCurrentMonth: false,
            isSunday: days.length % 7 === 0,
            isSaturday: days.length % 7 === 6,
        });
    }

    return days;
};

const getSelectedDateByGridPosition = (
    targetYear: number,
    targetMonth: number,
    sourceDays: CalendarDay[],
    sourceSelectedDate: string,
) => {
    const selectedIndex = sourceDays.findIndex(
        (day) => day.fullDate === sourceSelectedDate,
    );

    if (selectedIndex < 0) {
        return formatDateString(targetYear, targetMonth, 1);
    }

    const targetDays = getCalendarDays(targetYear, targetMonth);

    for (let index = selectedIndex; index >= 0; index -= 7) {
        const targetDay = targetDays[index];

        if (targetDay && targetDay.isCurrentMonth) {
            return targetDay.fullDate;
        }
    }

    const fallbackDay = targetDays.find((day) => day.isCurrentMonth);
    return fallbackDay?.fullDate ?? formatDateString(targetYear, targetMonth, 1);
};

const getCalendarMonthState = (dateString: string) => {
    const { year, month } = parseDateString(dateString);

    return { year, month };
};

const ReservationApplyPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {
        isRefreshing: isAuthUserRefreshing,
        refreshAuthUser,
    } = useRefreshAuthUser();
    const { accessToken, user, isLoggedIn } = useAuthSession();
    const initialDate = useMemo(() => {
        const routeState = location.state as { selectedDate?: string } | null;
        const queryDate = new URLSearchParams(location.search).get('date');

        return getInitialDate(routeState?.selectedDate ?? queryDate);
    }, [location.search, location.state]);
    const statusReturnDate = useMemo(() => {
        const routeState = location.state as { selectedDate?: string } | null;
        const queryDate = new URLSearchParams(location.search).get('date');
        const preferredDate = routeState?.selectedDate ?? queryDate;

        return isValidDateString(preferredDate) ? preferredDate : initialDate;
    }, [initialDate, location.search, location.state]);
    const initialStartAbsoluteSlot = useMemo(
        () => getInitialStartAbsoluteSlot(initialDate),
        [initialDate],
    );

    const [activeStep, setActiveStep] = useState<ReservationStepKey>('date');
    const [completedStepIndex, setCompletedStepIndex] = useState(-1);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [draftDate, setDraftDate] = useState(initialDate);
    const [visibleCalendar, setVisibleCalendar] = useState(
        () => getCalendarMonthState(initialDate),
    );
    const [selectedStartAbsoluteSlot, setSelectedStartAbsoluteSlot] = useState(
        initialStartAbsoluteSlot,
    );
    const [draftStartAbsoluteSlot, setDraftStartAbsoluteSlot] = useState(
        initialStartAbsoluteSlot,
    );
    const [selectedEndAbsoluteSlot, setSelectedEndAbsoluteSlot] = useState(
        initialStartAbsoluteSlot + DEFAULT_DURATION_SLOT_COUNT,
    );
    const [draftEndAbsoluteSlot, setDraftEndAbsoluteSlot] = useState(
        initialStartAbsoluteSlot + DEFAULT_DURATION_SLOT_COUNT,
    );
    const [selectedRepeatValue, setSelectedRepeatValue] = useState(0);
    const [draftRepeatValue, setDraftRepeatValue] = useState(0);
    const [selectedTeamValue, setSelectedTeamValue] = useState('private');
    const [draftTeamValue, setDraftTeamValue] = useState('private');
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [isRepeatNoticeOpen, setIsRepeatNoticeOpen] = useState(false);
    const [isRepeatNoticeChecked, setIsRepeatNoticeChecked] = useState(false);
    const [repeatConflicts, setRepeatConflicts] = useState<RepeatConflictOccurrence[]>([]);
    const [submitError, setSubmitError] = useState('');
    const [isSubmittingReservation, setIsSubmittingReservation] = useState(false);
    const todayDate = getTodayInSeoul();
    const isFlowCompleted = completedStepIndex >= STEP_ORDER.length - 1;
    const selectedStartDate = addDays(
        selectedDate,
        Math.floor(selectedStartAbsoluteSlot / 48),
    );
    const selectedStartTime = formatTimeForApi(selectedStartAbsoluteSlot);
    const selectedEndTime = formatTimeForApi(selectedEndAbsoluteSlot);
    const selectedReservationType = selectedTeamValue === 'private' ? 'private' : 'team';
    const selectedTeamId = parseTeamId(selectedTeamValue);
    const selectedRepeatCount = selectedRepeatValue > 0 ? selectedRepeatValue : 1;
    const isRepeatReservation = selectedRepeatValue > 0;

    const {
        data: daySchedule,
        isRefetching: isDayScheduleRefetching,
        refetch: refetchDaySchedule,
    } = useRoomDay({
        roomId: DEFAULT_ROOM_ID,
        date: selectedDate,
    });
    const {
        data: monthSchedule,
        isRefetching: isMonthScheduleRefetching,
        refetch: refetchMonthSchedule,
    } = useRoomMonth({
        roomId: DEFAULT_ROOM_ID,
        year: visibleCalendar.year,
        month: visibleCalendar.month,
    });

    const handleRefresh = async () => {
        await Promise.all([
            refetchDaySchedule(),
            refetchMonthSchedule(),
            refreshAuthUser(),
        ]);
    };

    const teamOptions = useMemo<ReservationTeamOption[]>(() => [
        PRIVATE_TEAM_OPTION,
        ...(user?.team ?? []).map((team) => ({
            label: team.name,
            value: `team:${team.id}`,
        })),
    ], [user?.team]);

    const disabledDateSet = useMemo(() => new Set(
        monthSchedule?.days
            .filter((day) => day.disabled)
            .map((day) => day.date) ?? [],
    ), [monthSchedule?.days]);
    const holidayDateSet = useMemo(() => new Set(
        monthSchedule?.days
            .filter((day) => day.isHoliday)
            .map((day) => day.date) ?? [],
    ), [monthSchedule?.days]);
    const isCalendarDayDisabled = useCallback((dateString: string) => (
        dateString < todayDate ||
        disabledDateSet.has(dateString)
    ), [disabledDateSet, todayDate]);

    const blockedSlots = useMemo(() => (
        daySchedule?.slots.map((slot) => (
            getSlotRange(slot.startTime, slot.endTime)
        )) ?? []
    ), [daySchedule?.slots]);
    const operatingRange = useMemo(() => (
        getOperatingSlotRange(daySchedule?.openTime, daySchedule?.closeTime)
    ), [daySchedule?.closeTime, daySchedule?.openTime]);

    const calendarDays = useMemo(
        () => getCalendarDays(visibleCalendar.year, visibleCalendar.month),
        [visibleCalendar.month, visibleCalendar.year],
    );

    const isStartTimeReserved = useCallback(
        (_key: string, absoluteSlot: number) => (
            daySchedule?.status === 'INACTIVE' ||
            isOutsideOperatingHours(operatingRange, absoluteSlot, absoluteSlot + 1) ||
            hasBlockedSlotOverlap(blockedSlots, absoluteSlot, absoluteSlot + 1) ||
            absoluteSlot < getMinimumStartAbsoluteSlot(selectedDate)
        ),
        [blockedSlots, daySchedule?.status, operatingRange, selectedDate],
    );

    const isStartTimeVisible = useCallback(
        (absoluteSlot: number) => (
            isStartSlotInsideOperatingHours(operatingRange, absoluteSlot)
        ),
        [operatingRange],
    );

    const selectedStartSlot = useMemo(
        () => createStartTimeSlot(
            selectedDate,
            draftStartAbsoluteSlot,
            isStartTimeReserved,
        ),
        [draftStartAbsoluteSlot, isStartTimeReserved, selectedDate],
    );
    const selectedStartSlotValue = parseSlotKey(selectedStartSlot.key);
    const selectedStartMeridiem = getMeridiem(selectedStartSlotValue.minutes);
    const visibleStartTimeOptions = useMemo(
        () => getVisibleTimeOptions(
            selectedDate,
            draftStartAbsoluteSlot,
            isStartTimeReserved,
        ),
        [draftStartAbsoluteSlot, isStartTimeReserved, selectedDate],
    );

    const isEndTimeReserved = useCallback(
        (_key: string, absoluteSlot: number) => (
            absoluteSlot <= selectedStartAbsoluteSlot ||
            isOutsideOperatingHours(
                operatingRange,
                selectedStartAbsoluteSlot,
                absoluteSlot,
            ) ||
            hasBlockedSlotOverlap(
                blockedSlots,
                selectedStartAbsoluteSlot,
                absoluteSlot,
            )
        ),
        [blockedSlots, operatingRange, selectedStartAbsoluteSlot],
    );
    const isEndTimeVisible = useCallback(
        (absoluteSlot: number) => (
            absoluteSlot > selectedStartAbsoluteSlot &&
            !isOutsideOperatingHours(
                operatingRange,
                selectedStartAbsoluteSlot,
                absoluteSlot,
            )
        ),
        [operatingRange, selectedStartAbsoluteSlot],
    );

    useEffect(() => {
        if (!operatingRange) return;

        setSelectedStartAbsoluteSlot((currentSlot) => (
            getFirstAvailableAbsoluteSlot(
                isStartTimeVisible,
                isStartTimeReserved,
                Math.max(0, currentSlot),
            )
        ));
        setDraftStartAbsoluteSlot((currentSlot) => (
            getFirstAvailableAbsoluteSlot(
                isStartTimeVisible,
                isStartTimeReserved,
                Math.max(0, currentSlot),
            )
        ));
    }, [isStartTimeReserved, isStartTimeVisible, operatingRange]);

    useEffect(() => {
        if (!operatingRange) return;

        setSelectedEndAbsoluteSlot((currentSlot) => (
            getClosestVisibleAbsoluteSlot(
                Math.max(currentSlot, selectedStartAbsoluteSlot + 1),
                isEndTimeVisible,
            )
        ));
        setDraftEndAbsoluteSlot((currentSlot) => (
            getClosestVisibleAbsoluteSlot(
                Math.max(currentSlot, selectedStartAbsoluteSlot + 1),
                isEndTimeVisible,
            )
        ));
    }, [isEndTimeVisible, operatingRange, selectedStartAbsoluteSlot]);

    const selectedEndSlot = useMemo(
        () => createStartTimeSlot(
            selectedDate,
            draftEndAbsoluteSlot,
            isEndTimeReserved,
        ),
        [draftEndAbsoluteSlot, isEndTimeReserved, selectedDate],
    );
    const selectedEndSlotValue = parseSlotKey(selectedEndSlot.key);
    const selectedEndMeridiem = getMeridiem(selectedEndSlotValue.minutes);
    const visibleEndTimeOptions = useMemo(
        () => getVisibleTimeOptions(
            selectedDate,
            draftEndAbsoluteSlot,
            isEndTimeReserved,
        ),
        [draftEndAbsoluteSlot, isEndTimeReserved, selectedDate],
    );

    const canOpenStep = (step: ReservationStepKey) => {
        const stepIndex = STEP_ORDER.indexOf(step);

        return isFlowCompleted || stepIndex <= completedStepIndex + 1;
    };
    const activeStepIndex = STEP_ORDER.indexOf(activeStep);
    const isStepVisuallyCompleted = (step: ReservationStepKey) => {
        const stepIndex = STEP_ORDER.indexOf(step);

        return completedStepIndex >= stepIndex && (isReviewMode || stepIndex < activeStepIndex);
    };
    const shouldShowConfirmedStepValue = (step: ReservationStepKey) => {
        const stepIndex = STEP_ORDER.indexOf(step);

        return isReviewMode || stepIndex < activeStepIndex;
    };
    const shouldMuteFutureStep = (step: ReservationStepKey) => {
        const stepIndex = STEP_ORDER.indexOf(step);

        return !isReviewMode && stepIndex > activeStepIndex;
    };

    const reservationSteps: ReservationStep[] = [
        {
            key: 'date',
            label: RESERVATION_APPLY_TEXT.dateSelect,
            value: formatStepDate(selectedDate),
            icon: 'checkCalendar',
            completed: isStepVisuallyCompleted('date'),
            disabled: !canOpenStep('date'),
            muted: shouldMuteFutureStep('date'),
        },
        {
            key: 'startTime',
            label: RESERVATION_APPLY_TEXT.startTime,
            value: activeStep === 'startTime' && !isReviewMode
                ? RESERVATION_APPLY_TEXT.startTime
                : shouldShowConfirmedStepValue('startTime') && completedStepIndex >= 1
                    ? formatCompactTime(selectedStartAbsoluteSlot)
                    : RESERVATION_APPLY_TEXT.startTime,
            icon: 'clock',
            completed: isStepVisuallyCompleted('startTime'),
            disabled: !canOpenStep('startTime'),
            muted: shouldMuteFutureStep('startTime'),
        },
        {
            key: 'endTime',
            label: RESERVATION_APPLY_TEXT.endTime,
            value: activeStep === 'endTime' && !isReviewMode
                ? RESERVATION_APPLY_TEXT.endTime
                : shouldShowConfirmedStepValue('endTime') && completedStepIndex >= 2
                    ? formatCompactTime(selectedEndAbsoluteSlot)
                    : RESERVATION_APPLY_TEXT.endTime,
            icon: 'clock',
            completed: isStepVisuallyCompleted('endTime'),
            disabled: !canOpenStep('endTime'),
            muted: shouldMuteFutureStep('endTime'),
        },
        {
            key: 'repeat',
            label: RESERVATION_APPLY_TEXT.repeatSettings,
            value: activeStep === 'repeat' && !isReviewMode
                ? RESERVATION_APPLY_TEXT.repeatChoice
                : shouldShowConfirmedStepValue('repeat') && completedStepIndex >= 3
                    ? formatRepeatLabel(selectedRepeatValue)
                    : RESERVATION_APPLY_TEXT.repeatChoice,
            icon: 'repeat',
            completed: isStepVisuallyCompleted('repeat'),
            disabled: !canOpenStep('repeat'),
            muted: shouldMuteFutureStep('repeat'),
        },
        {
            key: 'type',
            label: RESERVATION_APPLY_TEXT.teamSettings,
            value: activeStep === 'type' && !isReviewMode
                ? RESERVATION_APPLY_TEXT.teamSettings
                : shouldShowConfirmedStepValue('type') && completedStepIndex >= 4
                    ? formatTeamStepLabel(selectedTeamValue)
                    : RESERVATION_APPLY_TEXT.teamSettings,
            icon: 'people',
            completed: isStepVisuallyCompleted('type'),
            disabled: !canOpenStep('type'),
            muted: shouldMuteFutureStep('type'),
        },
    ];

    const handleSelectStep = (step: ReservationStepKey) => {
        if (!canOpenStep(step)) return;

        setIsReviewMode(false);
        setDraftDate(selectedDate);
        if (step === 'date') {
            setVisibleCalendar(getCalendarMonthState(selectedDate));
        }
        setDraftStartAbsoluteSlot(selectedStartAbsoluteSlot);
        setDraftEndAbsoluteSlot(selectedEndAbsoluteSlot);
        setDraftRepeatValue(selectedRepeatValue);
        setDraftTeamValue(selectedTeamValue);
        setActiveStep(step);
    };

    const completeStep = (step: ReservationStepKey) => {
        setCompletedStepIndex((currentIndex) => (
            Math.max(currentIndex, STEP_ORDER.indexOf(step))
        ));
    };

    const returnToReviewOrNext = (nextStep: ReservationStepKey) => {
        if (isFlowCompleted) {
            setIsReviewMode(true);
            return;
        }

        setActiveStep(nextStep);
    };

    const handleMoveCalendarMonth = (direction: -1 | 1) => {
        const movedDate = new Date(
            visibleCalendar.year,
            visibleCalendar.month - 1 + direction,
            1,
        );
        const nextYear = movedDate.getFullYear();
        const nextMonth = movedDate.getMonth() + 1;
        const nextSelectedDate = getSelectedDateByGridPosition(
            nextYear,
            nextMonth,
            calendarDays,
            draftDate,
        );
        const nextCalendarDays = getCalendarDays(nextYear, nextMonth);
        const selectableDate = !isCalendarDayDisabled(nextSelectedDate)
            ? nextSelectedDate
            : nextCalendarDays.find((day) => (
                day.isCurrentMonth && !isCalendarDayDisabled(day.fullDate)
            ))?.fullDate;

        setVisibleCalendar({ year: nextYear, month: nextMonth });

        if (selectableDate) {
            setDraftDate(selectableDate);
        }
    };

    const handleSelectCalendarDay = (day: CalendarDay, isDisabled: boolean) => {
        if (isDisabled) return;

        setDraftDate(day.fullDate);
        setVisibleCalendar(getCalendarMonthState(day.fullDate));
    };

    const getDefaultStartAbsoluteSlot = (dateString: string) => {
        const minimumSlot = dateString === todayDate
            ? Math.max(0, getMinimumStartAbsoluteSlot(dateString))
            : 0;

        return getFirstAvailableAbsoluteSlot(
            isStartTimeVisible,
            isStartTimeReserved,
            minimumSlot,
        );
    };

    const getDefaultEndAbsoluteSlot = (startAbsoluteSlot: number) => {
        const endVisible = (absoluteSlot: number) => (
            absoluteSlot > startAbsoluteSlot &&
            !isOutsideOperatingHours(
                operatingRange,
                startAbsoluteSlot,
                absoluteSlot,
            )
        );
        const endReserved = (_key: string, absoluteSlot: number) => (
            absoluteSlot <= startAbsoluteSlot ||
            isOutsideOperatingHours(
                operatingRange,
                startAbsoluteSlot,
                absoluteSlot,
            ) ||
            hasBlockedSlotOverlap(
                blockedSlots,
                startAbsoluteSlot,
                absoluteSlot,
            )
        );
        const preferredEndSlot = startAbsoluteSlot + DEFAULT_DURATION_SLOT_COUNT;

        if (
            endVisible(preferredEndSlot) &&
            !endReserved(getSlotKey(preferredEndSlot), preferredEndSlot)
        ) {
            return preferredEndSlot;
        }

        for (
            let absoluteSlot = preferredEndSlot - 1;
            absoluteSlot > startAbsoluteSlot;
            absoluteSlot -= 1
        ) {
            if (
                endVisible(absoluteSlot) &&
                !endReserved(getSlotKey(absoluteSlot), absoluteSlot)
            ) {
                return absoluteSlot;
            }
        }

        return getFirstAvailableAbsoluteSlot(
            endVisible,
            endReserved,
            startAbsoluteSlot + 1,
        );
    };

    const submitReservation = async (repeat: boolean) => {
        if (!isLoggedIn || !accessToken) {
            setSubmitError(RESERVATION_APPLY_TEXT.loginRequired);
            return;
        }

        if (selectedReservationType === 'team' && !selectedTeamId) {
            setSubmitError(RESERVATION_APPLY_TEXT.teamRequired);
            return;
        }

        setIsSubmittingReservation(true);
        setSubmitError('');

        try {
            const reservationResponse = await createReservation({
                accessToken,
                roomId: DEFAULT_ROOM_ID,
                type: selectedReservationType,
                startDate: selectedStartDate,
                count: selectedRepeatCount,
                startTime: selectedStartTime,
                endTime: selectedEndTime,
                teamId: selectedTeamId,
            });
            const temporaryReservation = createTemporaryReservation(
                reservationResponse,
                repeat,
            );

            if (!temporaryReservation) {
                throw new Error(RESERVATION_APPLY_TEXT.missingReservationResponse);
            }

            await queryClient.invalidateQueries({
                queryKey: reservationQueryKeys.all,
            });

            navigate(`/reservations/${temporaryReservation.id}`, {
                state: {
                    fromReservationApply: true,
                    temporaryReservation,
                    temporaryRepeatRounds: repeat
                        ? mapCreatedRepeatRounds(reservationResponse)
                        : undefined,
                    toastMessage: RESERVATION_APPLY_TEXT.submitSuccess,
                },
            });
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : RESERVATION_APPLY_TEXT.submitError,
            );
        } finally {
            setIsSubmittingReservation(false);
        }
    };

    const handleSubmit = async () => {
        if (isReviewMode) {
            if (!isRepeatReservation) {
                await submitReservation(false);
                return;
            }

            if (!isLoggedIn || !accessToken) {
                setSubmitError(RESERVATION_APPLY_TEXT.loginRequired);
                return;
            }

            setIsSubmittingReservation(true);
            setSubmitError('');

            try {
                const repeatCheck = await checkRepeatReservation({
                    accessToken,
                    roomId: DEFAULT_ROOM_ID,
                    type: selectedReservationType,
                    startDate: selectedStartDate,
                    count: selectedRepeatCount,
                    startTime: selectedStartTime,
                    endTime: selectedEndTime,
                    teamId: selectedTeamId,
                });

                if (repeatCheck.conflict_occurrences.length > 0) {
                    setRepeatConflicts(repeatCheck.conflict_occurrences);
                    setIsRepeatNoticeChecked(false);
                    setIsRepeatNoticeOpen(true);
                    return;
                }

                await submitReservation(true);
            } catch (error) {
                setSubmitError(
                    error instanceof Error
                        ? error.message
                        : RESERVATION_APPLY_TEXT.repeatCheckError,
                );
            } finally {
                setIsSubmittingReservation(false);
            }
            return;
        }

        if (activeStep === 'date') {
            if (isCalendarDayDisabled(draftDate)) return;

            const isDateChanged = draftDate !== selectedDate;
            const nextStartAbsoluteSlot = getDefaultStartAbsoluteSlot(draftDate);
            const nextEndAbsoluteSlot = getDefaultEndAbsoluteSlot(nextStartAbsoluteSlot);

            setSelectedDate(draftDate);
            setSelectedStartAbsoluteSlot(nextStartAbsoluteSlot);
            setDraftStartAbsoluteSlot(nextStartAbsoluteSlot);
            setSelectedEndAbsoluteSlot(nextEndAbsoluteSlot);
            setDraftEndAbsoluteSlot(nextEndAbsoluteSlot);
            completeStep('date');

            if (isFlowCompleted && isDateChanged) {
                setIsReviewMode(false);
                setActiveStep('startTime');
                return;
            }

            returnToReviewOrNext('startTime');
            return;
        }

        if (activeStep === 'startTime') {
            const nextStartAbsoluteSlot = (
                !isStartTimeVisible(draftStartAbsoluteSlot) ||
                isStartTimeReserved(
                    getSlotKey(draftStartAbsoluteSlot),
                    draftStartAbsoluteSlot,
                )
            )
                ? getNextAvailableAbsoluteSlot(
                    draftStartAbsoluteSlot,
                    1,
                    isStartTimeReserved,
                    isStartTimeVisible,
                )
                : draftStartAbsoluteSlot;
            const normalizedStart = normalizeAbsoluteSlotDate(
                selectedDate,
                nextStartAbsoluteSlot,
            );
            const isStartTimeChanged =
                normalizedStart.absoluteSlot !== selectedStartAbsoluteSlot ||
                normalizedStart.date !== selectedDate;
            const nextEndAbsoluteSlot = getDefaultEndAbsoluteSlot(
                normalizedStart.absoluteSlot,
            );

            setSelectedDate(normalizedStart.date);
            setDraftDate(normalizedStart.date);
            setSelectedStartAbsoluteSlot(normalizedStart.absoluteSlot);
            setDraftStartAbsoluteSlot(normalizedStart.absoluteSlot);
            setSelectedEndAbsoluteSlot(nextEndAbsoluteSlot);
            setDraftEndAbsoluteSlot(nextEndAbsoluteSlot);
            setVisibleCalendar(getCalendarMonthState(normalizedStart.date));
            completeStep('startTime');

            if (isFlowCompleted && isStartTimeChanged) {
                setIsReviewMode(false);
                setActiveStep('endTime');
                return;
            }

            returnToReviewOrNext('endTime');
            return;
        }

        if (activeStep === 'endTime') {
            if (
                !isEndTimeVisible(draftEndAbsoluteSlot) ||
                isEndTimeReserved(getSlotKey(draftEndAbsoluteSlot), draftEndAbsoluteSlot)
            ) {
                return;
            }

            setSelectedEndAbsoluteSlot(draftEndAbsoluteSlot);
            completeStep('endTime');
            returnToReviewOrNext('repeat');
            return;
        }

        if (activeStep === 'repeat') {
            setSelectedRepeatValue(draftRepeatValue);
            completeStep('repeat');
            returnToReviewOrNext('type');
            return;
        }

        if (activeStep === 'type') {
            setSelectedTeamValue(draftTeamValue);
            completeStep('type');
            setIsReviewMode(true);
        }
    };

    const handleCloseRepeatNotice = () => {
        setIsRepeatNoticeOpen(false);
        setIsRepeatNoticeChecked(false);
    };

    const handleConfirmRepeatReservation = async () => {
        if (!isRepeatNoticeChecked) return;

        setIsRepeatNoticeOpen(false);
        await submitReservation(true);
    };

    const handleStepStartTime = (direction: -1 | 1) => {
        setDraftStartAbsoluteSlot((currentAbsoluteSlot) => (
            getNextAvailableAbsoluteSlot(
                currentAbsoluteSlot,
                direction,
                isStartTimeReserved,
                isStartTimeVisible,
            )
        ));
    };

    const handleSelectStartMeridiem = (nextMeridiem: Meridiem) => {
        setDraftStartAbsoluteSlot((currentAbsoluteSlot) => {
            const nextAbsoluteSlot = getMeridiemAbsoluteSlot(
                getSlotKey(currentAbsoluteSlot),
                nextMeridiem,
                isStartTimeReserved,
                isStartTimeVisible,
            );

            return nextAbsoluteSlot ?? currentAbsoluteSlot;
        });
    };

    const handleStepStartMeridiem = (direction: -1 | 1) => {
        handleSelectStartMeridiem(direction > 0 ? '오후' : '오전');
    };

    const handleSelectStartTime = (key: string) => {
        const nextAbsoluteSlot = parseAbsoluteSlot(key);

        if (
            !isStartTimeVisible(nextAbsoluteSlot) ||
            isStartTimeReserved(key, nextAbsoluteSlot)
        ) return;

        setDraftStartAbsoluteSlot(nextAbsoluteSlot);
    };

    const handleStepEndTime = (direction: -1 | 1) => {
        setDraftEndAbsoluteSlot((currentAbsoluteSlot) => (
            getNextAvailableAbsoluteSlot(
                currentAbsoluteSlot,
                direction,
                isEndTimeReserved,
                isEndTimeVisible,
            )
        ));
    };

    const handleSelectEndMeridiem = (nextMeridiem: Meridiem) => {
        setDraftEndAbsoluteSlot((currentAbsoluteSlot) => {
            const nextAbsoluteSlot = getMeridiemAbsoluteSlot(
                getSlotKey(currentAbsoluteSlot),
                nextMeridiem,
                isEndTimeReserved,
                isEndTimeVisible,
            );

            return nextAbsoluteSlot ?? currentAbsoluteSlot;
        });
    };

    const handleStepEndMeridiem = (direction: -1 | 1) => {
        handleSelectEndMeridiem(direction > 0 ? '오후' : '오전');
    };

    const handleSelectEndTime = (key: string) => {
        const nextAbsoluteSlot = parseAbsoluteSlot(key);

        if (
            !isEndTimeVisible(nextAbsoluteSlot) ||
            isEndTimeReserved(key, nextAbsoluteSlot)
        ) return;

        setDraftEndAbsoluteSlot(nextAbsoluteSlot);
    };

    const handleStepRepeat = (direction: -1 | 1) => {
        setDraftRepeatValue((currentValue) => {
            const currentIndex = REPEAT_OPTIONS.findIndex((option) => (
                option.value === currentValue
            ));
            const nextIndex = Math.min(
                Math.max(currentIndex + direction, 0),
                REPEAT_OPTIONS.length - 1,
            );

            return REPEAT_OPTIONS[nextIndex].value;
        });
    };

    const handleSelectRepeat = (value: number) => {
        setDraftRepeatValue(value);
    };

    const handleStepTeam = (direction: -1 | 1) => {
        setDraftTeamValue((currentValue) => {
            const currentIndex = teamOptions.findIndex((option) => (
                option.value === currentValue
            ));
            const nextIndex = Math.min(
                Math.max(currentIndex + direction, 0),
                teamOptions.length - 1,
            );

            return teamOptions[nextIndex].value;
        });
    };

    const handleSelectTeam = (value: string) => {
        setDraftTeamValue(value);
    };

    const submitLabel = isReviewMode
        ? RESERVATION_COMMON_TEXT.apply
        : activeStep === 'date'
            ? RESERVATION_APPLY_TEXT.dateComplete
            : activeStep === 'startTime'
                ? RESERVATION_APPLY_TEXT.startTimeComplete
                : activeStep === 'endTime'
                    ? RESERVATION_APPLY_TEXT.endTimeComplete
                    : activeStep === 'repeat'
                        ? RESERVATION_APPLY_TEXT.repeatComplete
                        : RESERVATION_APPLY_TEXT.teamComplete;

    const cardHasStartTime = completedStepIndex >= 1 || isFlowCompleted;
    const cardHasEndTime = completedStepIndex >= 2 || isFlowCompleted;
    const cardTitle = cardHasEndTime
        ? `${formatCompactTime(selectedStartAbsoluteSlot)} - ${formatEndSummaryTime(
            selectedStartAbsoluteSlot,
            selectedEndAbsoluteSlot,
        )}`
        : cardHasStartTime
            ? `${formatCompactTime(selectedStartAbsoluteSlot)} - `
            : RESERVATION_APPLY_TEXT.selectTime;
    const cardDurationLabel = cardHasEndTime
        ? formatDurationLabel(selectedStartAbsoluteSlot, selectedEndAbsoluteSlot)
        : '';
    const cardDate = completedStepIndex >= 1 || isFlowCompleted
        ? addDays(selectedDate, Math.floor(selectedStartAbsoluteSlot / 48))
        : activeStep === 'date'
            ? draftDate
            : selectedDate;
    const cardTeamValue = activeStep === 'type' && !isReviewMode
        ? draftTeamValue
        : selectedTeamValue;
    const cardName = cardTeamValue === 'private'
        ? user?.nickname ?? RESERVATION_APPLY_TEXT.privatePractice
        : formatTeamLabel(teamOptions, cardTeamValue);
    const repeatBadgeLabel = completedStepIndex >= 3 || isReviewMode
        ? formatRepeatLabel(selectedRepeatValue)
        : RESERVATION_APPLY_TEXT.noRepeatBadge;

    return (
        <MobilePageLayout
            isRefreshing={
                isDayScheduleRefetching ||
                isMonthScheduleRefetching ||
                isAuthUserRefreshing
            }
            onRefresh={handleRefresh}
            header={(
                <PageSubHeader
                    title={RESERVATION_APPLY_TEXT.headerTitle}
                    onBack={() => navigate('/', {
                        state: {
                            selectedDate: statusReturnDate,
                        },
                    })}
                />
            )}
        >
            <main className="reservation-apply-page">
                <section
                    className="reservation-apply-card"
                    aria-label={RESERVATION_APPLY_TEXT.guideAriaLabel}
                >
                    <div className="reservation-apply-card__content">
                        <div className="reservation-apply-card__nickname">
                            {cardName}
                        </div>
                        <p className="reservation-apply-card__hint">
                            {formatHeaderDate(cardDate)}
                        </p>
                        <h2 className="reservation-apply-card__title">
                            {cardTitle}
                            {cardDurationLabel && (
                                <span className="reservation-apply-card__duration">
                                    ({cardDurationLabel})
                                </span>
                            )}
                        </h2>
                    </div>

                    <span className="reservation-apply-card__badge">
                        {repeatBadgeLabel}
                    </span>
                </section>

                {isReviewMode && (
                    <section
                        className="reservation-review-panel"
                        aria-label={RESERVATION_APPLY_TEXT.reviewGuideAriaLabel}
                    >
                        <ul className="reservation-review-list">
                            <li className="reservation-review-list__item reservation-review-list__item--danger">
                                <span>
                                    <InfoCircleIcon size={18} color="var(--text-error)" />
                                </span>
                                <p>{RESERVATION_APPLY_TEXT.reviewNotices[0]}</p>
                            </li>
                            <li className="reservation-review-list__item">
                                <span>
                                    <InfoCircleIcon size={18} />
                                </span>
                                <p>{RESERVATION_APPLY_TEXT.reviewNotices[1]}</p>
                            </li>
                            <li className="reservation-review-list__item">
                                <span>
                                    <InfoCircleIcon size={18} />
                                </span>
                                <p>{RESERVATION_APPLY_TEXT.reviewNotices[2]}</p>
                            </li>
                            <li className="reservation-review-list__item">
                                <span>
                                    <InfoCircleIcon size={18} />
                                </span>
                                <p>{RESERVATION_APPLY_TEXT.reviewNotices[3]}</p>
                            </li>
                            <li className="reservation-review-list__item">
                                <span>
                                    <InfoCircleIcon size={18} />
                                </span>
                                <p>{RESERVATION_APPLY_TEXT.reviewNotices[4]}</p>
                            </li>
                        </ul>
                    </section>
                )}

                <div
                    className={[
                        'reservation-controls-panel',
                        isReviewMode ? 'reservation-controls-panel--collapsed' : '',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                >
                    {isReviewMode && (
                        <button
                            type="button"
                            className="reservation-controls-panel__expand"
                            onClick={() => setIsReviewMode(false)}
                            aria-label={RESERVATION_APPLY_TEXT.reopenTeamSettingsAriaLabel}
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="m6 14 6-6 6 6" />
                            </svg>
                        </button>
                    )}

                    <ReservationStepTabs
                        steps={reservationSteps}
                        activeStep={isReviewMode ? null : activeStep}
                        onSelectStep={handleSelectStep}
                    />

                    {!isReviewMode && activeStep === 'date' && (
                        <section
                            className="reservation-date-section"
                            aria-label={RESERVATION_APPLY_TEXT.dateSelect}
                        >
                            <h2 className="reservation-date-section__title">
                                {RESERVATION_APPLY_TEXT.dateSelect}
                            </h2>

                            <div className="reservation-apply-calendar">
                                <div className="reservation-apply-calendar__month">
                                    <button
                                        type="button"
                                        aria-label={CALENDAR_TEXT.previousMonthAriaLabel}
                                        onClick={() => handleMoveCalendarMonth(-1)}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="m15 18-6-6 6-6" />
                                        </svg>
                                    </button>

                                    <strong>
                                        {visibleCalendar.year}.
                                        {String(visibleCalendar.month).padStart(2, '0')}
                                    </strong>

                                    <button
                                        type="button"
                                        aria-label={CALENDAR_TEXT.nextMonthAriaLabel}
                                        onClick={() => handleMoveCalendarMonth(1)}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="m9 6 6 6-6 6" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="reservation-apply-calendar__weekdays">
                                    {WEEK_DAYS.map((weekDay, index) => (
                                        <span
                                            key={weekDay}
                                            className={[
                                                index === 0 ? 'is-sunday' : '',
                                                index === 6 ? 'is-saturday' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {weekDay}
                                        </span>
                                    ))}
                                </div>

                                <div className="reservation-apply-calendar__grid">
                                    {calendarDays.map((day) => {
                                        const isDisabled = isCalendarDayDisabled(day.fullDate);
                                        const isHoliday = (
                                            day.isCurrentMonth &&
                                            holidayDateSet.has(day.fullDate)
                                        );

                                        return (
                                            <button
                                                key={day.fullDate}
                                                type="button"
                                                className={[
                                                    'reservation-apply-calendar__day',
                                                    !day.isCurrentMonth ? 'is-adjacent' : '',
                                                    day.isSunday ? 'is-sunday' : '',
                                                    day.isSaturday ? 'is-saturday' : '',
                                                    draftDate === day.fullDate ? 'is-selected' : '',
                                                    isDisabled ? 'is-disabled' : '',
                                                ]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                                onClick={() => (
                                                    handleSelectCalendarDay(day, isDisabled)
                                                )}
                                                disabled={isDisabled}
                                                aria-label={isHoliday
                                                    ? CALENDAR_TEXT.unavailableHolidayAriaLabel(
                                                        visibleCalendar.month,
                                                        day.date,
                                                    )
                                                    : undefined}
                                            >
                                                <span>{day.date}</span>
                                                {isHoliday && (
                                                    <span className="reservation-apply-calendar__holiday">
                                                        {CALENDAR_TEXT.holiday}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {!isReviewMode && activeStep === 'startTime' && (
                        <div key="start-time-picker" className="reservation-step-panel">
                            <ReservationStartTimePicker
                                title={RESERVATION_APPLY_TEXT.startTime}
                                ariaLabel={RESERVATION_APPLY_TEXT.startTimeSelectAriaLabel}
                                times={visibleStartTimeOptions}
                                selectedTimeKey={selectedStartSlot.key}
                                meridiem={selectedStartMeridiem}
                                onStepMeridiem={handleStepStartMeridiem}
                                onSelectMeridiem={handleSelectStartMeridiem}
                                onStepTime={handleStepStartTime}
                                onSelectTime={handleSelectStartTime}
                            />
                        </div>
                    )}

                    {!isReviewMode && activeStep === 'endTime' && (
                        <div key="end-time-picker" className="reservation-step-panel">
                            <ReservationStartTimePicker
                                title={RESERVATION_APPLY_TEXT.endTime}
                                ariaLabel={RESERVATION_APPLY_TEXT.endTimeSelectAriaLabel}
                                times={visibleEndTimeOptions}
                                selectedTimeKey={selectedEndSlot.key}
                                meridiem={selectedEndMeridiem}
                                onStepMeridiem={handleStepEndMeridiem}
                                onSelectMeridiem={handleSelectEndMeridiem}
                                onStepTime={handleStepEndTime}
                                onSelectTime={handleSelectEndTime}
                            />
                        </div>
                    )}

                    {!isReviewMode && activeStep === 'repeat' && (
                        <div key="repeat-picker" className="reservation-step-panel">
                            <ReservationRepeatPicker
                                options={REPEAT_OPTIONS}
                                selectedValue={draftRepeatValue}
                                onStepRepeat={handleStepRepeat}
                                onSelectRepeat={handleSelectRepeat}
                            />
                        </div>
                    )}

                    {!isReviewMode && activeStep === 'type' && (
                        <div key="team-picker" className="reservation-step-panel">
                            <ReservationTeamPicker
                                options={teamOptions}
                                selectedValue={draftTeamValue}
                                onStepTeam={handleStepTeam}
                                onSelectTeam={handleSelectTeam}
                            />
                        </div>
                    )}
                </div>

                <div className="reservation-apply-bottom">
                    <button
                        type="button"
                        className="reservation-apply-submit"
                        onClick={handleSubmit}
                        disabled={isSubmittingReservation}
                    >
                        {isSubmittingReservation
                            ? RESERVATION_APPLY_TEXT.processing
                            : submitLabel}
                    </button>
                    {submitError && (
                        <p className="reservation-apply-error" role="alert">
                            {submitError}
                        </p>
                    )}
                </div>

                {isRepeatNoticeOpen && (
                    <div
                        className="action-modal reservation-repeat-notice-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reservation-repeat-notice-title"
                    >
                        <div
                            className="action-modal__backdrop"
                            onClick={handleCloseRepeatNotice}
                        />

                        <section className="action-modal__panel reservation-repeat-notice-modal__panel">
                            <div className="action-modal__icon reservation-repeat-notice-modal__icon">
                                <InfoCircleIcon size={52} color="var(--text-error)" />
                            </div>

                            <h2
                                id="reservation-repeat-notice-title"
                                className="action-modal__title reservation-repeat-notice-modal__title"
                            >
                                {RESERVATION_APPLY_TEXT.repeatNoticeTitle}
                            </h2>

                            <p className="reservation-repeat-notice-modal__description">
                                {RESERVATION_APPLY_TEXT.repeatNoticeDescription}
                            </p>

                            <div className="reservation-repeat-notice-modal__dates">
                                <strong>
                                    {RESERVATION_APPLY_TEXT.repeatNoticeExcludedDates}
                                </strong>
                                <ul
                                    className={
                                        repeatConflicts.length === 1
                                            ? 'reservation-repeat-notice-modal__date-list--single'
                                            : ''
                                    }
                                >
                                    {repeatConflicts.map((occurrence) => (
                                        <li key={`${occurrence.week}-${occurrence.date}`}>
                                            {formatRepeatConflictDate(occurrence)}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <label className="reservation-repeat-notice-modal__check">
                                <input
                                    type="checkbox"
                                    checked={isRepeatNoticeChecked}
                                    onChange={(event) => (
                                        setIsRepeatNoticeChecked(event.target.checked)
                                    )}
                                />
                                <span aria-hidden="true" />
                                <p>{RESERVATION_APPLY_TEXT.repeatNoticeConfirm}</p>
                            </label>

                            <div className="action-modal__actions reservation-repeat-notice-modal__actions">
                                <button
                                    type="button"
                                    className="action-modal__button action-modal__button--cancel reservation-repeat-notice-modal__button"
                                    onClick={handleCloseRepeatNotice}
                                >
                                    {RESERVATION_APPLY_TEXT.cancel}
                                </button>

                                <button
                                    type="button"
                                    className="action-modal__button action-modal__button--primary reservation-repeat-notice-modal__button"
                                    onClick={handleConfirmRepeatReservation}
                                    disabled={!isRepeatNoticeChecked}
                                >
                                    {RESERVATION_APPLY_TEXT.submit}
                                </button>
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </MobilePageLayout>
    );
};

export default ReservationApplyPage;
