import { cookBiographyContactContains, cookBiographyNormalize } from '../../shared/cookBiographyContact';
import { StatusAlert } from './base/status-alert';

export function CookBiographyContactNotice({ text, warning, previewLabel }: { text: string; warning: string; previewLabel: string }) {
    if (!cookBiographyContactContains(text)) {
        return null;
    }

    const preview = cookBiographyNormalize(text);

    return (
        <div className="grid min-w-0 gap-2">
            <StatusAlert tone="warning">{warning}</StatusAlert>
            {preview ? (
                <div className="grid min-w-0 gap-1">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{previewLabel}</span>
                    <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground">{preview}</p>
                </div>
            ) : null}
        </div>
    );
}
