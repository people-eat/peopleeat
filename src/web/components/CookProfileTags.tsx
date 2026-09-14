import type { ComponentProps } from 'react';

import { cn } from '../utils/cn';

const cookProfileTagSizeClass = {
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
} as const;

type CookProfileTagSize = keyof typeof cookProfileTagSizeClass;

export type CookProfileTagProps = Omit<ComponentProps<'span'>, 'children'> & {
    children: string;
    size?: CookProfileTagSize;
};

/**
 * Single cuisine-style / cooking-philosophy chip.
 * Uses muted fill so tags stay readable on white cards and the warm page canvas
 * (never `Badge secondary`, which is white-on-white).
 */
export function CookProfileTag({ children, size = 'sm', className, ...props }: CookProfileTagProps) {
    return (
        <span
            data-slot="cook-profile-tag"
            data-size={size}
            className={cn(
                'inline-flex w-fit max-w-full shrink-0 items-center justify-center overflow-hidden rounded-full',
                'bg-muted font-medium whitespace-nowrap text-foreground',
                cookProfileTagSizeClass[size],
                className,
            )}
            {...props}
        >
            <span className="min-w-0 truncate">{children}</span>
        </span>
    );
}

export type CookProfileTagsCook = {
    cuisineStyle?: string | null;
    cookingPhilosophy?: string | null;
};

/** Ordered, trimmed cuisine + philosophy labels for a cook. */
export function cookProfileTagLabels(cook: CookProfileTagsCook): string[] {
    return [cook.cuisineStyle, cook.cookingPhilosophy].map((tag) => tag?.trim() ?? '').filter((tag) => tag.length > 0);
}

export type CookProfileTagsProps = Omit<ComponentProps<'ul'>, 'children'> & {
    cuisineStyle?: string | null;
    cookingPhilosophy?: string | null;
    size?: CookProfileTagSize;
};

/**
 * Cuisine style + cooking philosophy pills for cook surfaces
 * (public hero, offer cards, checkout, featured lists).
 * Returns null when both values are empty.
 */
export function CookProfileTags({ cuisineStyle, cookingPhilosophy, size = 'sm', className, ...props }: CookProfileTagsProps) {
    const tags = cookProfileTagLabels({ cuisineStyle, cookingPhilosophy });
    if (tags.length === 0) return null;

    return (
        <ul
            data-slot="cook-profile-tags"
            data-size={size}
            className={cn('flex flex-wrap', size === 'md' ? 'gap-2' : 'gap-1.5', className)}
            {...props}
        >
            {tags.map((tag) => (
                <li key={tag} className="min-w-0 max-w-full">
                    <CookProfileTag size={size}>{tag}</CookProfileTag>
                </li>
            ))}
        </ul>
    );
}
