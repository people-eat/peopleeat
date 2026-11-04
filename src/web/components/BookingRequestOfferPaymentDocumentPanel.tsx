import { FileTextIcon } from 'lucide-react';

import type { Locale } from '../../shared/locale';
import { Button } from './base/button';

export function bookingRequestOfferPaymentDocumentVisible(paymentStatus: string): boolean {
    return paymentStatus === 'PAYED' || paymentStatus === 'TRANSFERRED' || paymentStatus === 'PAYED_OUT_OF_SYSTEM';
}

export function BookingRequestOfferPaymentDocumentPanel({
    locale,
    title,
    description,
    file,
    busy,
    onRegenerate,
}: {
    locale: Locale;
    title: string;
    description: string;
    file: { url: string; filename: string } | null;
    busy: boolean;
    onRegenerate: () => void;
}) {
    return (
        <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium text-foreground">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {file ? (
                    <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                    >
                        <FileTextIcon className="size-4 shrink-0" aria-hidden />
                        {file.filename}
                    </a>
                ) : null}
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRegenerate}>
                    {
                        (file
                            ? { de: busy ? 'Wird erstellt…' : 'PDF erneuern', en: busy ? 'Generating…' : 'Regenerate PDF' }
                            : { de: busy ? 'Wird erstellt…' : 'PDF erstellen', en: busy ? 'Generating…' : 'Generate PDF' })[locale]
                    }
                </Button>
            </div>
        </section>
    );
}
