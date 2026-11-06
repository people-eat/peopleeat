import { BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX } from '../../shared/bookingRequestKitchenDetails';
import { textNormalizeProse } from '../../shared/textNormalize';
import type { BookingRequestKitchenDetails } from '../domain/bookingRequest';
import { bookingRequestKitchenDetailsIsEmpty } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

const availabilities = new Set(['FULL', 'LIMITED', 'NONE', 'UNKNOWN']);
const spaces = new Set(['YES', 'LIMITED', 'NO']);
const guestTablewareValues = new Set(['PROVIDED', 'COOK_BRINGS', 'MIXED']);

export type BookingRequestKitchenDetailsWriteInput = {
    availability?: string | null;
    fridgeSpace?: string | null;
    platingSpace?: string | null;
    guestTableware?: string | null;
    notes?: string | null;
};

function enumOrNull<T extends string>(value: string | null | undefined, allowed: ReadonlySet<string>): T | null {
    if (value == null || value.trim().length === 0) return null;
    return allowed.has(value) ? (value as T) : null;
}

function bookingRequestKitchenDetailsNormalize(input: BookingRequestKitchenDetailsWriteInput): BookingRequestKitchenDetails | null {
    const notesRaw = input.notes == null ? '' : textNormalizeProse(input.notes);
    const details: BookingRequestKitchenDetails = {
        availability: enumOrNull(input.availability, availabilities),
        fridgeSpace: enumOrNull(input.fridgeSpace, spaces),
        platingSpace: enumOrNull(input.platingSpace, spaces),
        guestTableware: enumOrNull(input.guestTableware, guestTablewareValues),
        notes: notesRaw.length > 0 ? notesRaw : null,
    };
    return bookingRequestKitchenDetailsIsEmpty(details) ? null : details;
}

/**
 * `undefined` = leave stored kitchenDetails unchanged.
 * `null` = persist empty.
 * Toggle off: create stores null; update ignores the incoming field.
 */
export async function bookingRequestKitchenDetailsPrepareForWrite(
    input: BookingRequestKitchenDetailsWriteInput | null | undefined,
    serverRuntime: ServerRuntime,
    userId: string | null | undefined,
    mode: 'create' | 'update',
): Promise<BookingRequestKitchenDetails | null | undefined> {
    const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_KITCHEN_DETAILS', serverRuntime, userId);
    if (!enabled) {
        return mode === 'create' ? null : undefined;
    }
    if (input === undefined) return undefined;
    if (input === null) return null;
    return bookingRequestKitchenDetailsNormalize(input);
}

export function bookingRequestKitchenDetailsPhotoIdsAssert(fileUploadIds: readonly string[], commandName: string): string[] {
    const unique = Array.from(new Set(fileUploadIds));
    if (unique.length > BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX) {
        throw new Error(`${commandName}: at most ${BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX} kitchen details photos are allowed`);
    }
    return unique;
}
