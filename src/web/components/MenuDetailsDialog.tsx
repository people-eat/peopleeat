import type { ReactNode } from 'react';

import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { Badge } from './base/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';
import { CookMenuCardMedia } from './CookMenuCard';

export function MenuDetailsDialog({
    open,
    onOpenChange,
    title,
    description,
    courseCount,
    images,
    publishedAt,
    deletedAt,
    meta,
    dialogTitle,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    courseCount: number;
    images: ReadonlyArray<string>;
    publishedAt?: string | null;
    deletedAt?: string | null;
    meta?: ReactNode;
    dialogTitle?: string;
}) {
    const locale = useLocale();
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const headerTitle = dialogTitle?.trim() || title;
    const isDeleted = deletedAt != null;
    const courseLabel =
        courseCount === 1 ? { de: '1 Gang', en: '1 course' }[locale] : { de: `${courseCount} Gänge`, en: `${courseCount} courses` }[locale];
    const bodyDescription = description.trim().length > 0 ? description : { de: 'Keine Beschreibung', en: 'No description' }[locale];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{headerTitle}</DialogTitle>
                    <DialogDescription className="sr-only">{{ de: 'Details zum Menü', en: 'Menu details' }[locale]}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col justify-start gap-8 lg:flex-row">
                    <CookMenuCardMedia images={images} className="size-56 rounded-2xl lg:size-80" />
                    <div className="flex min-w-0 flex-col gap-4">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <p className="whitespace-pre-wrap text-muted-foreground">{bodyDescription}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            {isDeleted ? <Badge variant="destructive">{{ de: 'Gelöscht', en: 'Deleted' }[locale]}</Badge> : null}
                            {publicationEnabled && !isDeleted ? (
                                <Badge variant="outline">
                                    {publishedAt
                                        ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                        : { de: 'Entwurf', en: 'Draft' }[locale]}
                                </Badge>
                            ) : null}
                            <span className="text-sm text-muted-foreground">{courseLabel}</span>
                            {meta != null ? <span className="text-sm text-muted-foreground">{meta}</span> : null}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
