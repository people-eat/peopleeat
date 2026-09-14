import { SoupIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';

export function MealDetailsDialog({
    open,
    onOpenChange,
    title,
    description,
    imageUrl,
    dialogTitle,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    imageUrl?: string | null;
    dialogTitle?: string;
}) {
    const locale = useLocale();
    const headerTitle = dialogTitle?.trim() || title;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{headerTitle}</DialogTitle>
                    <DialogDescription className="sr-only">{{ de: 'Details zum Gericht', en: 'Meal details' }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col justify-start gap-8 lg:flex-row">
                    {imageUrl ? (
                        <div className="aspect-square w-56 shrink-0 lg:w-80">
                            <img src={imageUrl} alt="" className="size-full rounded-2xl object-cover" />
                        </div>
                    ) : (
                        <div className="flex aspect-square w-56 shrink-0 flex-col items-center justify-center gap-4 rounded-2xl bg-secondary p-8 text-muted-foreground lg:w-80">
                            <SoupIcon className="size-8" aria-hidden />
                            <p>{{ de: 'Kein Bild', en: 'No image' }[locale]}</p>
                        </div>
                    )}
                    <div className="flex min-w-0 flex-col gap-4">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        {description.trim().length > 0 ? <p className="whitespace-pre-wrap text-muted-foreground">{description}</p> : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
