import type { ReactNode } from 'react';

import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useT } from '../hooks/useT';
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
    const { t } = useT('common');
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const headerTitle = dialogTitle?.trim() || title;
    const isDeleted = deletedAt != null;
    const courseLabel = t('menuDetails.courseCount', { count: courseCount });
    const bodyDescription = description.trim().length > 0 ? description : t('menuDetails.noDescription');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{headerTitle}</DialogTitle>
                    <DialogDescription className="sr-only">{t('menuDetails.title')}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col justify-start gap-8 lg:flex-row">
                    <CookMenuCardMedia images={images} className="size-56 rounded-2xl lg:size-80" />
                    <div className="flex min-w-0 flex-col gap-4">
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <p className="whitespace-pre-wrap text-muted-foreground">{bodyDescription}</p>
                        <div className="flex flex-wrap items-center gap-2">
                            {isDeleted ? <Badge variant="destructive">{t('contentPage.deleted')}</Badge> : null}
                            {publicationEnabled && !isDeleted ? (
                                <Badge variant="outline">
                                    {publishedAt ? t('contentPage.status.published') : t('contentPage.status.draft')}
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
