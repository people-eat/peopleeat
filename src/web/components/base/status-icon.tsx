import type { ComponentProps } from 'react';

import { cn } from '../../utils/cn';
import { statusIcons, statusIconToneClass } from './status';
import type { StatusTone } from './status';

const sizeClass = {
    sm: 'size-5 [&_svg]:size-3',
    default: 'size-8 [&_svg]:size-4',
    lg: 'size-10 [&_svg]:size-5',
} as const;

export type StatusIconProps = Omit<ComponentProps<'span'>, 'children'> & {
    tone: StatusTone;
    size?: keyof typeof sizeClass;
};

/**
 * Soft circular status glyph — the shared visual identity for status messaging.
 * Own colors intentionally so parent chrome (e.g. sidebar active text) cannot wash them out.
 */
function StatusIcon({ tone, size = 'default', className, ...props }: StatusIconProps) {
    const Icon = statusIcons[tone];

    return (
        <span
            data-slot="status-icon"
            data-tone={tone}
            aria-hidden="true"
            className={cn(
                'inline-flex shrink-0 items-center justify-center rounded-full',
                statusIconToneClass[tone],
                sizeClass[size],
                className,
            )}
            {...props}
        >
            <Icon />
        </span>
    );
}

export { StatusIcon };
