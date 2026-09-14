import { createHash } from 'node:crypto';

import type { Pool } from 'pg';

import { idCreate, isNanoId } from '../../src/shared/idCreate';
import type { MigrateConfig } from './config';

export type FetchedFile = {
    fileUploadId: string;
    filename: string;
    mediaType: string;
    size: number;
    bytes: Buffer;
    sourceUrl: string;
};

type FileFetchStats = {
    attempted: number;
    succeeded: number;
    failed: number;
    skippedDuplicate: number;
};

export type FileImporter = {
    stats: FileFetchStats;
    /** Fetch URL (or build from route + id) and return fileUploadId, or null on failure. */
    ensureFromUrl: (url: string, userId?: string | null) => Promise<string | null>;
    ensureFromRoute: (route: string, imageId: string, userId?: string | null) => Promise<string | null>;
    getCachedFileUploadId: (imageIdOrUrl: string) => string | null;
};

function routePath(route: string, imageId: string): string {
    const cleanRoute = route.replace(/^\//, '').replace(/\/$/, '');
    return `/${cleanRoute}/${imageId}`;
}

async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function run(): Promise<void> {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index]!);
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
    return results;
}

export function fileImporterCreate(
    config: MigrateConfig,
    pg: Pool,
    onMissing: (source: string, detail: Record<string, unknown>) => Promise<void>,
): FileImporter {
    const byKey = new Map<string, string>();
    /** Coalesce concurrent ensure* calls for the same URL / imageId. */
    const inflight = new Map<string, Promise<string | null>>();
    const stats: FileFetchStats = { attempted: 0, succeeded: 0, failed: 0, skippedDuplicate: 0 };
    const fetchStartedAt = Date.now();
    let lastFetchLogAt = 0;

    function logFetchProgress(force = false) {
        const now = Date.now();
        if (!force && stats.attempted % 25 !== 0 && now - lastFetchLogAt < 2_000) return;
        lastFetchLogAt = now;
        const seconds = ((now - fetchStartedAt) / 1000).toFixed(1);
        console.log(
            `Fetching FileUploads… attempted=${stats.attempted.toLocaleString('en-US')} ok=${stats.succeeded.toLocaleString('en-US')} fail=${stats.failed.toLocaleString('en-US')} dup=${stats.skippedDuplicate.toLocaleString('en-US')} (${seconds}s)`,
        );
    }

    async function insertFile(file: FetchedFile, userId: string | null | undefined): Promise<void> {
        if (config.dryRun) return;
        await pg.query(
            `INSERT INTO "FileUploads" ("fileUploadId", "userId", "filename", "mediaType", "size", "bytes", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW())
             ON CONFLICT ("fileUploadId") DO NOTHING`,
            [file.fileUploadId, userId ?? null, file.filename, file.mediaType, file.size, file.bytes],
        );
    }

    async function fetchBytes(url: string): Promise<{ bytes: Buffer; mediaType: string } | null> {
        stats.attempted += 1;
        logFetchProgress();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config.httpTimeoutMs);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'user-agent': 'peopleeat-migrate/1.0' },
                redirect: 'follow',
            });
            if (!response.ok) {
                stats.failed += 1;
                await onMissing('HttpFileFetch', { url, status: response.status });
                return null;
            }
            const arrayBuffer = await response.arrayBuffer();
            const bytes = Buffer.from(arrayBuffer);
            const mediaType = response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream';
            stats.succeeded += 1;
            return { bytes, mediaType };
        } catch (error) {
            stats.failed += 1;
            await onMissing('HttpFileFetch', {
                url,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        } finally {
            clearTimeout(timer);
        }
    }

    async function ensureFromUrl(url: string, userId?: string | null): Promise<string | null> {
        const normalized = url.trim();
        if (!normalized) return null;
        const cached = byKey.get(normalized);
        if (cached) {
            stats.skippedDuplicate += 1;
            return cached;
        }

        const imageId = (() => {
            try {
                const pathname = new URL(normalized).pathname;
                const last = pathname.split('/').filter(Boolean).pop() ?? '';
                return last.replace(/\.(png|jpe?g|webp|gif)$/i, '');
            } catch {
                return '';
            }
        })();

        if (imageId && byKey.has(imageId)) {
            const id = byKey.get(imageId)!;
            byKey.set(normalized, id);
            stats.skippedDuplicate += 1;
            return id;
        }

        const inflightKey = imageId || normalized;
        const pending = inflight.get(inflightKey) ?? inflight.get(normalized);
        if (pending) {
            stats.skippedDuplicate += 1;
            const id = await pending;
            if (id) byKey.set(normalized, id);
            return id;
        }

        const promise = (async (): Promise<string | null> => {
            const fetched = await fetchBytes(normalized);
            if (!fetched) return null;

            const fileUploadId = isNanoId(imageId) ? imageId : idCreate();
            const filename = imageId ? `${imageId}.png` : `${fileUploadId}.bin`;
            const file: FetchedFile = {
                fileUploadId,
                filename,
                mediaType: fetched.mediaType,
                size: fetched.bytes.byteLength,
                bytes: fetched.bytes,
                sourceUrl: normalized,
            };
            await insertFile(file, userId);
            byKey.set(normalized, fileUploadId);
            if (imageId) byKey.set(imageId, fileUploadId);
            return fileUploadId;
        })();

        inflight.set(normalized, promise);
        if (imageId) inflight.set(imageId, promise);
        try {
            return await promise;
        } finally {
            inflight.delete(normalized);
            if (imageId) inflight.delete(imageId);
        }
    }

    async function ensureFromRoute(route: string, imageId: string, userId?: string | null): Promise<string | null> {
        if (!imageId) return null;
        if (byKey.has(imageId)) {
            stats.skippedDuplicate += 1;
            return byKey.get(imageId)!;
        }
        const routeInflightKey = `route:${route}:${imageId}`;
        const pending = inflight.get(routeInflightKey) ?? inflight.get(imageId);
        if (pending) {
            stats.skippedDuplicate += 1;
            return pending;
        }
        const path = routePath(route, imageId);
        const withEl = `${config.sourceWebOrigin}${path}?el=1024`;
        const withoutEl = `${config.sourceWebOrigin}${path}`;
        const promise = (async () => (await ensureFromUrl(withEl, userId)) ?? (await ensureFromUrl(withoutEl, userId)))();
        inflight.set(routeInflightKey, promise);
        inflight.set(imageId, promise);
        try {
            return await promise;
        } finally {
            inflight.delete(routeInflightKey);
            // Keep imageId mapped via byKey; only drop inflight slot.
            if (inflight.get(imageId) === promise) inflight.delete(imageId);
        }
    }

    return {
        stats,
        ensureFromUrl,
        ensureFromRoute,
        getCachedFileUploadId(imageIdOrUrl) {
            return byKey.get(imageIdOrUrl) ?? null;
        },
    };
}

/** Prefetch a list of absolute URLs with bounded concurrency (used by verify/smoke). */
export async function prefetchUrls(importer: FileImporter, urls: string[], concurrency: number): Promise<void> {
    await mapPool(urls, concurrency, async (url) => {
        await importer.ensureFromUrl(url);
    });
}

export function contentHash(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}
