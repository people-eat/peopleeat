export type Progress = {
    tick: (n?: number) => void;
    done: () => void;
};

/**
 * Throttled console progress: every ~500 items or ~2s, plus start and completion.
 * Example: `Importing Sessions… 12,000/746,208 (1.6%)`
 */
export function progressCreate(label: string, total: number): Progress {
    let current = 0;
    const startedAt = Date.now();
    let lastLogAt = 0;

    const format = (value: number) => value.toLocaleString('en-US');

    const log = (force = false) => {
        const now = Date.now();
        if (!force && current !== 0 && current !== total && current % 500 !== 0 && now - lastLogAt < 2_000) {
            return;
        }
        lastLogAt = now;
        const pct = total <= 0 ? 100 : ((current / total) * 100).toFixed(1);
        console.log(`${label} ${format(current)}/${format(total)} (${pct}%)`);
    };

    log(true);

    return {
        tick(n = 1) {
            current += n;
            log();
        },
        done() {
            current = Math.max(current, total);
            const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
            console.log(`${label} done in ${seconds}s (${format(current)}/${format(total)})`);
        },
    };
}
