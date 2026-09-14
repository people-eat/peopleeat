import { Button } from './base/button';

export function BiographySuggestionReview({
    currentBiography,
    suggestedBiography,
    locale,
    onAccept,
    onDiscard,
}: {
    currentBiography: string;
    suggestedBiography: string;
    locale: 'de' | 'en';
    onAccept: () => void;
    onDiscard: () => void;
}) {
    const currentLabel = { de: 'Aktuell', en: 'Current' }[locale];
    const suggestedLabel = { de: 'Vorschlag', en: 'Suggestion' }[locale];
    const emptyLabel = { de: 'Noch keine Biografie.', en: 'No biography yet.' }[locale];

    return (
        <div className="grid min-w-0 gap-3 rounded-xl border border-border p-4">
            <div className="grid min-w-0 gap-1">
                <p className="text-sm font-medium">{{ de: 'Biografie-Vorschlag prüfen', en: 'Review biography suggestion' }[locale]}</p>
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Vergleiche den aktuellen Text mit dem KI-Vorschlag. Übernehmen füllt das Textfeld, Speichern schreibt die Biografie.',
                            en: 'Compare the current text with the AI suggestion. Accept fills the text field; Save writes the biography.',
                        }[locale]
                    }
                </p>
            </div>
            <div className="grid min-w-0 items-start gap-3 md:grid-cols-2">
                <BiographyPanel
                    label={currentLabel}
                    text={currentBiography.trim() ? currentBiography : emptyLabel}
                    muted={!currentBiography.trim()}
                />
                <BiographyPanel label={suggestedLabel} text={suggestedBiography} />
            </div>
            <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={onDiscard}>
                    {{ de: 'Verwerfen', en: 'Discard' }[locale]}
                </Button>
                <Button type="button" onClick={onAccept}>
                    {{ de: 'Übernehmen', en: 'Accept' }[locale]}
                </Button>
            </div>
        </div>
    );
}

function BiographyPanel({ label, text, muted }: { label: string; text: string; muted?: boolean }) {
    return (
        <div className="grid w-full min-w-0 content-start gap-2 self-start">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
            <p
                className={
                    muted
                        ? 'min-h-32 rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-muted-foreground'
                        : 'min-h-32 rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-foreground'
                }
            >
                {text}
            </p>
        </div>
    );
}
