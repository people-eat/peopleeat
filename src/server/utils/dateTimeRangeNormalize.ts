const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DATE_TIME_RANGE_MAX_SPAN_MS = 366 * MS_PER_DAY;

export type DateTimeRangeValue = {
    startDateTime: Date;
    endDateTime: Date;
};

export function dateTimeRangeNormalize(range: { startDateTime: Date | string; endDateTime: Date | string }): DateTimeRangeValue {
    const startDateTime = range.startDateTime instanceof Date ? range.startDateTime : new Date(range.startDateTime);
    const endDateTime = range.endDateTime instanceof Date ? range.endDateTime : new Date(range.endDateTime);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
        throw new Error('dateTimeRangeNormalize: invalid DateTimeRange');
    }
    if (startDateTime.getTime() > endDateTime.getTime()) {
        throw new Error('dateTimeRangeNormalize: startDateTime must be <= endDateTime');
    }
    if (endDateTime.getTime() - startDateTime.getTime() > DATE_TIME_RANGE_MAX_SPAN_MS) {
        throw new Error('dateTimeRangeNormalize: range exceeds 366 days');
    }

    return { startDateTime, endDateTime };
}
