/**
 * History-based estimated menu-price range (P25–P75) for a requested headcount.
 * Independent of price class. Always returns a non-null band via local → shrink-to-global → static prior.
 * See docs/architecture/booking.md.
 */

import { bookingRequestMenuPriceClassUnionRangePerPersonCents, bookingRequestPaidParticipants } from './bookingRequestOfferPriceGuidance';

export type BookingRequestExpectedMenuPriceRangeSample = {
    participantsAdult: number;
    participantsDiscounted: number;
    menuPriceCents: number;
};

export type BookingRequestExpectedMenuPriceRangeResult = {
    minAmountCents: number;
    maxAmountCents: number;
};

const PERCENTILE_LOW = 0.25;
const PERCENTILE_HIGH = 0.75;
const N_MIN = 20;
const SHRINK_PSEUDO_COUNT = 20;
const HEADCOUNT_WIDEN_STEPS = [0.5, 1.0, 2.0] as const;

/** Linear-interpolated percentile on a sorted ascending numeric array (R-7 / `percentile_cont` style). */
export function percentileCont(sortedAscending: readonly number[], percentile: number): number {
    if (sortedAscending.length === 0) {
        throw new Error('percentileCont requires at least one value');
    }
    if (sortedAscending.length === 1) {
        return sortedAscending[0]!;
    }
    const clamped = Math.min(1, Math.max(0, percentile));
    const index = (sortedAscending.length - 1) * clamped;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
        return sortedAscending[lower]!;
    }
    const weight = index - lower;
    return sortedAscending[lower]! * (1 - weight) + sortedAscending[upper]! * weight;
}

function normalizeSamples(samples: readonly BookingRequestExpectedMenuPriceRangeSample[]): Array<{
    paidParticipants: number;
    perPersonCents: number;
}> {
    const normalized: Array<{ paidParticipants: number; perPersonCents: number }> = [];
    for (const sample of samples) {
        if (sample.menuPriceCents <= 0) continue;
        const paidParticipants = bookingRequestPaidParticipants(sample.participantsAdult, sample.participantsDiscounted);
        if (paidParticipants <= 0) continue;
        normalized.push({
            paidParticipants,
            perPersonCents: sample.menuPriceCents / paidParticipants,
        });
    }
    return normalized;
}

function localPoolPerPersonCents(
    normalized: readonly { paidParticipants: number; perPersonCents: number }[],
    requestPaid: number,
): number[] {
    let best: number[] = [];
    for (const delta of HEADCOUNT_WIDEN_STEPS) {
        const pool = normalized
            .filter((sample) => Math.abs(sample.paidParticipants - requestPaid) <= delta)
            .map((sample) => sample.perPersonCents);
        if (pool.length > best.length) {
            best = pool;
        }
        if (pool.length >= N_MIN) {
            return pool;
        }
    }
    return best;
}

function bandFromPerPerson(values: readonly number[]): { minPp: number; maxPp: number } {
    const sorted = [...values].sort((a, b) => a - b);
    const minPp = percentileCont(sorted, PERCENTILE_LOW);
    const maxPp = percentileCont(sorted, PERCENTILE_HIGH);
    return minPp <= maxPp ? { minPp, maxPp } : { minPp: maxPp, maxPp: minPp };
}

function shrinkTowardGlobal(localValues: readonly number[], globalValues: readonly number[]): { minPp: number; maxPp: number } {
    const global = bandFromPerPerson(globalValues);
    if (localValues.length === 0) {
        return global;
    }
    const local = bandFromPerPerson(localValues);
    const weight = localValues.length / (localValues.length + SHRINK_PSEUDO_COUNT);
    return {
        minPp: weight * local.minPp + (1 - weight) * global.minPp,
        maxPp: weight * local.maxPp + (1 - weight) * global.maxPp,
    };
}

/**
 * Estimate total menu-price min/max for the requested headcount from historical offer samples.
 * Never returns null: rich local → P25/P75; sparse → shrink toward global; empty → static class-union prior.
 */
export function bookingRequestExpectedMenuPriceRangeCalculate(input: {
    participantsAdult: number;
    participantsDiscounted: number;
    samples: readonly BookingRequestExpectedMenuPriceRangeSample[];
}): BookingRequestExpectedMenuPriceRangeResult {
    const participantsAdult = Math.max(0, input.participantsAdult);
    const participantsDiscounted = Math.max(0, input.participantsDiscounted);
    const requestPaid = Math.max(1, bookingRequestPaidParticipants(participantsAdult, participantsDiscounted));

    const normalized = normalizeSamples(input.samples);
    const prior = bookingRequestMenuPriceClassUnionRangePerPersonCents(participantsAdult);

    let minPp: number;
    let maxPp: number;

    if (normalized.length === 0) {
        minPp = prior.minCents;
        maxPp = prior.maxCents;
    } else {
        const localValues = localPoolPerPersonCents(normalized, requestPaid);
        const globalValues = normalized.map((sample) => sample.perPersonCents);

        if (localValues.length >= N_MIN) {
            ({ minPp, maxPp } = bandFromPerPerson(localValues));
        } else {
            ({ minPp, maxPp } = shrinkTowardGlobal(localValues, globalValues));
        }
    }

    let minAmountCents = Math.round(minPp * requestPaid);
    let maxAmountCents = Math.round(maxPp * requestPaid);
    if (minAmountCents > maxAmountCents) {
        const swap = minAmountCents;
        minAmountCents = maxAmountCents;
        maxAmountCents = swap;
    }

    return { minAmountCents, maxAmountCents };
}
