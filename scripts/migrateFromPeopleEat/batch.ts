/** Split an array into fixed-size chunks (last chunk may be smaller). */
export function chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0) throw new Error('chunkArray: size must be > 0');
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/** Run async work over items with a fixed concurrency pool. */
export async function mapPool<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    async function run(): Promise<void> {
        while (next < items.length) {
            const index = next;
            next += 1;
            results[index] = await worker(items[index]!, index);
        }
    }
    const workers = Math.max(1, Math.min(concurrency, items.length || 1));
    await Promise.all(Array.from({ length: workers }, () => run()));
    return results;
}
