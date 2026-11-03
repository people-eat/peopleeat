import type { PropsWithChildren } from 'react';
import { cn } from '../../utils/cn';

/**
 * Container-query card grid for chat data parts.
 * Wrapper owns `@container`.
 * - `responsive` — 1 → 2 @ 28rem → 3 @ 42rem (booking / user / chef cards)
 * - `upToTwo` — 1 → 2 @ 36rem (compact meal / menu rows; stay stacked longer than booking cards)
 */
export function ChatCardList({ children, columns = 'responsive' }: PropsWithChildren<{ columns?: 'responsive' | 'upToTwo' }>) {
    return (
        <div className="@container w-full min-w-0 max-w-full">
            <ul
                className={cn(
                    'grid w-full grid-cols-1 items-stretch gap-3',
                    columns === 'responsive' && '@md:grid-cols-2 @2xl:grid-cols-3',
                    columns === 'upToTwo' && '@xl:grid-cols-2',
                )}
            >
                {children}
            </ul>
        </div>
    );
}
