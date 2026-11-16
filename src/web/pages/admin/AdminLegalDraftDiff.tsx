import { diffLines } from 'diff';

import { t } from '../../../i18n/t';
import { legalBodyDeNormalize } from '../../../shared/legalBodyDeNormalize';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';

type DiffLine = {
    key: string;
    type: 'added' | 'removed' | 'unchanged';
    value: string;
};

function adminLegalDiffLines(baseline: string, next: string): DiffLine[] {
    const parts = diffLines(legalBodyDeNormalize(baseline), legalBodyDeNormalize(next));
    const lines: DiffLine[] = [];
    let index = 0;
    for (const part of parts) {
        const type: DiffLine['type'] = part.added ? 'added' : part.removed ? 'removed' : 'unchanged';
        const chunkLines = part.value.split('\n');
        // `diff` keeps a trailing empty string after a final newline — drop it so we do not render a ghost row.
        if (chunkLines.length > 0 && chunkLines[chunkLines.length - 1] === '') {
            chunkLines.pop();
        }
        for (const line of chunkLines) {
            lines.push({ key: `${index}-${type}`, type, value: line });
            index += 1;
        }
    }
    return lines;
}

export function AdminLegalDraftDiff({ baseline, next }: { baseline: string | null; next: string }) {
    const locale = useLocale();

    if (baseline === null) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPublishedVersionToCompare')}</p>;
    }

    if (legalBodyDeNormalize(baseline) === legalBodyDeNormalize(next)) {
        return <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noChangesFromTheCurrentPublishedVersion')}</p>;
    }

    const lines = adminLegalDiffLines(baseline, next);

    return (
        <pre
            aria-label={t(locale, 'admin', 'copy.changesFromTheCurrentPublishedVersion')}
            className="overflow-x-auto font-mono text-sm/relaxed whitespace-pre-wrap"
        >
            {lines.map((line) => {
                const prefix = line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';
                return (
                    <div
                        key={line.key}
                        className={cn(
                            'px-2 py-0.5',
                            line.type === 'added' && 'bg-success/15 text-foreground',
                            line.type === 'removed' && 'bg-destructive/15 text-foreground',
                            line.type === 'unchanged' && 'text-muted-foreground',
                        )}
                    >
                        <span className="select-none text-muted-foreground" aria-hidden>
                            {prefix}{' '}
                        </span>
                        <span>{line.value.length === 0 ? '\u00a0' : line.value}</span>
                    </div>
                );
            })}
        </pre>
    );
}
