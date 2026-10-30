import { CircleCheckIcon, CircleXIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react';

import type { StatusTone } from '../../../shared/statusTone';

export type { StatusTone } from '../../../shared/statusTone';

export const statusIcons = {
    info: InfoIcon,
    success: CircleCheckIcon,
    warning: TriangleAlertIcon,
    error: CircleXIcon,
} as const;

/** Soft circular chip behind the Lucide glyph — shared status palette. */
export const statusIconToneClass: Record<StatusTone, string> = {
    info: 'bg-blue-200 text-blue-600',
    success: 'bg-green-200 text-green-600',
    warning: 'bg-yellow-200 text-yellow-600',
    error: 'bg-red-200 text-red-600',
};

/** Compact pill / labeled badge surfaces. */
export const statusBadgeToneClass: Record<StatusTone, string> = {
    info: 'border-blue-300 bg-blue-100 text-foreground',
    success: 'border-green-300 bg-green-100 text-foreground',
    warning: 'border-yellow-300 bg-yellow-100 text-foreground',
    error: 'border-red-300 bg-red-100 text-foreground',
};

/** Full-width alert / banner surfaces — shared status palette. */
export const statusAlertToneClass: Record<StatusTone, string> = {
    info: 'border-blue-400 bg-blue-100 text-foreground *:data-[slot=alert-description]:text-muted-foreground',
    success: 'border-green-400 bg-green-100 text-foreground *:data-[slot=alert-description]:text-muted-foreground',
    warning: 'border-yellow-400 bg-yellow-100 text-foreground *:data-[slot=alert-description]:text-muted-foreground',
    error: 'border-red-400 bg-red-100 text-foreground *:data-[slot=alert-description]:text-muted-foreground',
};
