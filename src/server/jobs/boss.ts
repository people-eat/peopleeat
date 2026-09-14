import { sql } from 'drizzle-orm';
import { fromDrizzle, PgBoss } from 'pg-boss';
import type { JobWithMetadata } from 'pg-boss';
import type { DatabaseTransaction } from '../db';
import { environmentVariables } from '../env/environmentVariablesCreate';
import type { QueuedJobDefinition } from './types';

const globalRef = globalThis as unknown as { __pgBoss?: PgBoss; __pgBossStartPromise?: Promise<void> };

export async function ensureBossStarted(): Promise<PgBoss> {
    if (!globalRef.__pgBoss) {
        globalRef.__pgBoss = new PgBoss(environmentVariables.databaseUrl);
        globalRef.__pgBoss.on('error', (error) => {
            console.error('[pg-boss]', error.message);
        });
    }

    if (!globalRef.__pgBossStartPromise) {
        globalRef.__pgBossStartPromise = globalRef.__pgBoss.start().then(() => undefined);
    }

    await globalRef.__pgBossStartPromise;
    return globalRef.__pgBoss;
}

export type JobEnqueueOptions = {
    startAfter?: Date | string | number;
    transaction?: DatabaseTransaction;
    /** Custom pg-boss job id (e.g. deterministic per-entity ids). */
    id?: string;
    /** pg-boss singleton key for coalesce / one-pending-per-key semantics. */
    singletonKey?: string;
};

export async function jobEnqueue<TData>(
    definition: QueuedJobDefinition<TData>,
    data: TData,
    options?: JobEnqueueOptions,
): Promise<string | null> {
    const boss = await ensureBossStarted();
    return boss.send(definition.name, data as object, {
        startAfter: options?.startAfter,
        id: options?.id,
        singletonKey: options?.singletonKey,
        db: options?.transaction ? fromDrizzle(options.transaction, sql) : undefined,
    });
}

// Count active (created | retry | active) jobs for a queue. Used to derive
// live "is this background work running" flags without persisting status on
// domain rows — pg-boss is already the source of truth and auto-expires
// stuck `active` rows via each job's `expireInSeconds`, so a crashed worker
// can never leave the count stuck above zero.
export async function jobsActiveCount<TData>(definition: QueuedJobDefinition<TData>): Promise<number> {
    const boss = await ensureBossStarted();
    const rows = await boss.findJobs(definition.name, { queued: true });
    return rows.length;
}

/**
 * Find jobs whose payload contains `data` (pg-boss object containment match).
 * Default `queued: true` returns created | retry | active only — the pending
 * work ops care about for a booking offer / request.
 */
export async function jobsFindByData<TData>(
    definition: QueuedJobDefinition<TData>,
    data: Partial<TData> & object,
    options?: { queued?: boolean },
): Promise<JobWithMetadata<TData>[]> {
    const boss = await ensureBossStarted();
    return boss.findJobs<TData>(definition.name, {
        data,
        queued: options?.queued ?? true,
    });
}

/**
 * Find jobs by exact pg-boss job id. Default `queued: true` returns
 * created | retry | active only — used for live "generating" flags when the
 * id is deterministic per entity (no domain column).
 */
export async function jobsFindById<TData>(
    definition: QueuedJobDefinition<TData>,
    jobId: string,
    options?: { queued?: boolean },
): Promise<JobWithMetadata<TData>[]> {
    const boss = await ensureBossStarted();
    return boss.findJobs<TData>(definition.name, {
        id: jobId,
        queued: options?.queued ?? true,
    });
}

export async function jobCancel(queueName: string, jobId: string): Promise<void> {
    const boss = await ensureBossStarted();
    await boss.cancel(queueName, jobId);
}
