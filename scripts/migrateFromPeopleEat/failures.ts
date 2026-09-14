export type FailureEntry = {
    source: string;
    sourceId: string;
    message: string;
};

export type FailureLog = {
    record: (source: string, sourceId: string, message: string) => void;
    total: () => number;
    printSummary: () => void;
};

/** Collect skipped/failed import attempts and print a grouped summary at the end. */
export function failureLogCreate(): FailureLog {
    const entries: FailureEntry[] = [];

    return {
        record(source, sourceId, message) {
            entries.push({ source, sourceId, message });
        },
        total: () => entries.length,
        printSummary() {
            if (entries.length === 0) {
                console.log('Failure summary: no failed/skipped import attempts.');
                return;
            }

            const bySource = new Map<string, FailureEntry[]>();
            for (const entry of entries) {
                const list = bySource.get(entry.source) ?? [];
                list.push(entry);
                bySource.set(entry.source, list);
            }

            console.log(`\nFailure summary: ${entries.length.toLocaleString('en-US')} failed/skipped attempt(s)`);
            const sources = [...bySource.keys()].sort();
            for (const source of sources) {
                const list = bySource.get(source)!;
                console.log(`  ${source}: ${list.length.toLocaleString('en-US')}`);
                for (const entry of list.slice(0, 5)) {
                    const short = entry.message.length > 160 ? `${entry.message.slice(0, 157)}…` : entry.message;
                    console.log(`    - ${entry.sourceId}: ${short}`);
                }
                if (list.length > 5) {
                    console.log(`    … and ${list.length - 5} more`);
                }
            }
        },
    };
}
