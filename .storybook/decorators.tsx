import type { Decorator } from '@storybook/react-vite';
import type { ReactNode } from 'react';

import type { FeatureToggleKey } from '../src/shared/featureToggle';
import { FeatureToggleKeysProvider } from '../src/web/hooks/useFeatureToggleActive';

export const STORYBOOK_TIME_ZONE = 'Europe/Berlin';

/** Padded canvas for list/offer cards. */
export function cardCanvasDecorator(Story: () => ReactNode) {
    return (
        <div className="mx-auto max-w-md p-6">
            <Story />
        </div>
    );
}

/** Fixed-height chat viewport so transcript shells behave like product panes. */
export function chatViewportDecorator(Story: () => ReactNode) {
    return (
        <div className="flex h-[560px] max-w-lg flex-col border border-border bg-background">
            <Story />
        </div>
    );
}

/** Wide padded row for side-by-side Perspectives galleries. */
export function perspectivesCanvasDecorator(Story: () => ReactNode) {
    return (
        <div className="p-6">
            <Story />
        </div>
    );
}

export function withFeatureToggles(keys: readonly FeatureToggleKey[]): Decorator {
    return (Story) => (
        <FeatureToggleKeysProvider value={keys}>
            <Story />
        </FeatureToggleKeysProvider>
    );
}
