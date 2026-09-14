import type { ReactNode } from 'react';

import { cn } from '../utils/cn';

export function SelectableChip({
    label,
    icon,
    selected,
    disabled,
    onClick,
}: {
    label: string;
    icon?: ReactNode;
    selected: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-pressed={selected}
            className={cn(
                'inline-flex cursor-pointer items-center gap-2 self-start rounded-3xl border px-3 py-2 text-sm transition outline-none',
                'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                'disabled:cursor-not-allowed disabled:opacity-50',
                selected
                    ? 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
                    : 'border-border bg-secondary text-secondary-foreground hover:bg-muted active:bg-muted/80',
            )}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
