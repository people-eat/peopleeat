import type { BookingRequestSetting } from '../domain/bookingRequest';
import { bookingRequestSettingParse } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

/**
 * `undefined` = leave stored setting unchanged (update omit).
 * `null` = persist unknown.
 * Toggle off: create stores null; update ignores the incoming field.
 */
export async function bookingRequestSettingPrepareForWrite(
    setting: string | null | undefined,
    serverRuntime: ServerRuntime,
    userId: string | null | undefined,
    mode: 'create' | 'update',
): Promise<BookingRequestSetting | null | undefined> {
    const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_SETTING', serverRuntime, userId);
    if (!enabled) {
        return mode === 'create' ? null : undefined;
    }
    if (setting === undefined) return undefined;
    if (setting === null) return null;
    return bookingRequestSettingParse(setting);
}
