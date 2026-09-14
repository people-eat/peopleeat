import type { Pool as MysqlPool, RowDataPacket } from 'mysql2/promise';
import type { Pool as PgPool } from 'pg';
import { PgBoss } from 'pg-boss';

import type { Archiver } from './archive';
import { asDate } from './transforms';

type JobSend = {
    name: string;
    data: Record<string, unknown>;
    startAfter: Date;
};

/**
 * Map open predecessor TimeControlledTasks → pg-boss queued jobs.
 * Types without a peopleeat equivalent are archived.
 */
export async function timeControlledTasksImport(args: {
    mysql: MysqlPool;
    pg: PgPool;
    targetDatabaseUrl: string;
    dryRun: boolean;
    archive: Archiver;
}): Promise<void> {
    const { mysql, pg, targetDatabaseUrl, dryRun, archive } = args;
    console.log('Importing TimeControlledTasks → pg-boss…');

    let rows: RowDataPacket[];
    try {
        const [result] = await mysql.query<RowDataPacket[]>('SELECT * FROM TimeControlledTasks');
        rows = result;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(message)) {
            console.warn('Skipping TimeControlledTasks (table missing)');
            return;
        }
        throw error;
    }

    const offerRequestIds = new Map<string, string>();
    if (rows.length > 0 && !dryRun) {
        const { rows: offers } = await pg.query<{ bookingRequestOfferId: string; bookingRequestId: string }>(
            `SELECT "bookingRequestOfferId", "bookingRequestId" FROM "BookingRequestOffers"`,
        );
        for (const offer of offers) {
            offerRequestIds.set(offer.bookingRequestOfferId, offer.bookingRequestId);
        }
    }

    const toEnqueue: JobSend[] = [];
    let archived = 0;
    let skippedPast = 0;

    for (const row of rows) {
        const taskId = String(row.timeControlledTaskId);
        const key = String(row.key);
        const referenceId = row.referenceId != null ? String(row.referenceId) : null;
        const dueDate = asDate(row.dueDate as Date | string | null);
        if (!referenceId || !dueDate) {
            await archive.write('TimeControlledTasks.invalid', taskId, row);
            archived += 1;
            continue;
        }

        const mapped = mapTask(key, referenceId, dueDate, offerRequestIds);
        if (mapped === 'archive') {
            await archive.write('TimeControlledTasks.unmapped', taskId, row);
            archived += 1;
            continue;
        }
        if (mapped === 'skip-past') {
            skippedPast += 1;
            continue;
        }
        toEnqueue.push(mapped);
    }

    if (dryRun) {
        console.log(`  [dry-run] would enqueue ${toEnqueue.length}; archive ${archived}; skip past-due unread ${skippedPast}`);
        return;
    }

    if (toEnqueue.length === 0) {
        console.log(`  enqueued 0; archived ${archived}; skipped past-due unread ${skippedPast}`);
        return;
    }

    const boss = new PgBoss(targetDatabaseUrl);
    await boss.start();
    try {
        // pg-boss requires createQueue before send; the app normally does this
        // in ensureJobsStarted, which this one-shot script never runs.
        for (const name of new Set(toEnqueue.map((job) => job.name))) {
            await boss.createQueue(name);
        }
        let enqueued = 0;
        for (const job of toEnqueue) {
            await boss.send(job.name, job.data, { startAfter: job.startAfter });
            enqueued += 1;
        }
        console.log(`  enqueued ${enqueued}; archived ${archived}; skipped past-due unread ${skippedPast}`);
    } finally {
        await boss.stop({ graceful: false, timeout: 5_000 });
    }
}

function mapTask(key: string, referenceId: string, dueDate: Date, offerRequestIds: Map<string, string>): JobSend | 'archive' | 'skip-past' {
    switch (key) {
        case 'BOOKING_REQUEST_OFFER_PULL_PAYMENT':
            return {
                name: 'booking-request-offer-pull-payment',
                data: { bookingRequestOfferId: referenceId },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT':
            return {
                name: 'booking-request-offer-pull-payment-announcement',
                data: { bookingRequestOfferId: referenceId },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_OFFER_EVENT_TOMORROW': {
            const bookingRequestId = offerRequestIds.get(referenceId);
            if (!bookingRequestId) return 'archive';
            return {
                name: 'booking-request-offer-event-tomorrow-notify',
                data: { bookingRequestId, bookingRequestOfferId: referenceId },
                startAfter: dueDate,
            };
        }
        case 'BOOKING_REQUEST_OFFER_TESTIMONIAL_MEMORY_NUDGE':
            return {
                name: 'booking-request-offer-testimonial-reminder',
                data: { bookingRequestOfferId: referenceId, kind: 'MEMORY_NUDGE' },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_OFFER_TESTIMONIAL_REMINDER_MORNING':
            return {
                name: 'booking-request-offer-testimonial-reminder',
                data: { bookingRequestOfferId: referenceId, kind: 'REMINDER_MORNING' },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_OFFER_TESTIMONIAL_REMINDER_EVENING':
            return {
                name: 'booking-request-offer-testimonial-reminder',
                data: { bookingRequestOfferId: referenceId, kind: 'REMINDER_EVENING' },
                startAfter: dueDate,
            };
        case 'CALL_SLOT_BOOKING_REMINDER_60MIN_BEFORE':
            return {
                name: 'booking-request-offer-call-slot-reminder',
                data: { cookCallSlotBookingId: referenceId },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_NO_OFFERS_REMINDER':
            return {
                name: 'booking-request-no-offers-notify',
                data: { bookingRequestId: referenceId, hours: 24 },
                startAfter: dueDate,
            };
        case 'BOOKING_REQUEST_NO_OFFERS_48H_ADMIN_NOTIFICATION':
            return {
                name: 'booking-request-no-offers-notify',
                data: { bookingRequestId: referenceId, hours: 48 },
                startAfter: dueDate,
            };
        case 'USER_BOOKING_REQUEST_REACTION_REMINDER':
            return {
                name: 'booking-request-reaction-reminder',
                data: { bookingRequestId: referenceId },
                startAfter: dueDate,
            };
        case 'USER_BOOKING_REQUEST_OFFER_UNREAD_NOTIFICATION_REMINDER':
        case 'COOK_BOOKING_REQUEST_OFFER_UNREAD_NOTIFICATION_REMINDER':
            // Predecessor ~30s debounce; past-due on freeze → skip (new app uses 60s chat-notify).
            if (dueDate.getTime() <= Date.now()) return 'skip-past';
            return {
                name: 'booking-request-offer-chat-message-notify',
                data: {
                    bookingRequestOfferId: referenceId,
                    audience: key.startsWith('COOK_') ? 'COOK' : 'CUSTOMER',
                },
                startAfter: dueDate,
            };
        case 'COOK_SCRAPE':
            return 'archive';
        default:
            return 'archive';
    }
}
