import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
    AssistantMarkdown,
    ExternalLinkConfirmationProvider,
    isInternalHref,
    localeFromPathname,
    localizeInternalHref,
} from './AssistantMarkdown';

// Minimal router harness so `useRouter()` inside the markdown anchor resolves.
// A catch-all `$` route lets us start the memory history at any pathname (e.g.
// `/en/foo`) without wiring the real route tree.
function renderInRouter(node: ReactNode, initialPath = '/') {
    const rootRoute = createRootRoute({ component: () => <>{node}</> });
    const catchAll = createRoute({ getParentRoute: () => rootRoute, path: '$', component: () => null });
    const router = createRouter({
        routeTree: rootRoute.addChildren([catchAll]),
        history: createMemoryHistory({ initialEntries: [initialPath] }),
    });
    // The test router's route tree isn't the registered one; the cast keeps
    // `RouterProvider`'s generic happy without pulling in `routeTree.gen`.
    return render(<RouterProvider router={router as never} />);
}

describe('AssistantMarkdown anchor rendering', () => {
    it('renders an internal link as a same-tab anchor with no target/confirmation', async () => {
        renderInRouter(<AssistantMarkdown text="See the [terms](/terms)." />);

        const link = await screen.findByRole('link', { name: 'terms' });
        expect(link.getAttribute('href')).toBe('/terms');
        expect(link.getAttribute('target')).toBeNull();
    });

    it('locale-prefixes an internal link when on an English route', async () => {
        renderInRouter(<AssistantMarkdown text="See the [terms](/terms)." />, '/en/about');

        const link = await screen.findByRole('link', { name: 'terms' });
        expect(link.getAttribute('href')).toBe('/en/terms');
    });

    it('renders an external link with confirmation enabled as a button (no direct anchor)', async () => {
        renderInRouter(<AssistantMarkdown text="[GitHub](https://github.com/example)" />);

        const button = await screen.findByRole('button', { name: 'GitHub' });
        expect(button).toBeTruthy();
        expect(screen.queryByRole('link', { name: 'GitHub' })).toBeNull();
    });

    it('renders an external link with confirmation disabled as a direct new-tab anchor', async () => {
        renderInRouter(
            <ExternalLinkConfirmationProvider enabled={false}>
                <AssistantMarkdown text="[GitHub](https://github.com/example)" />
            </ExternalLinkConfirmationProvider>,
        );

        const link = await screen.findByRole('link', { name: 'GitHub' });
        expect(link.getAttribute('href')).toBe('https://github.com/example');
        expect(link.getAttribute('target')).toBe('_blank');
    });
});

describe('isInternalHref', () => {
    it('treats single-leading-slash paths as internal', () => {
        expect(isInternalHref('/terms')).toBe(true);
        expect(isInternalHref('/')).toBe(true);
        expect(isInternalHref('/chat?chatId=abc')).toBe(true);
    });

    it('treats absolute URLs and protocol-relative hrefs as external', () => {
        expect(isInternalHref('https://github.com/example')).toBe(false);
        expect(isInternalHref('//evil.example.com')).toBe(false);
        expect(isInternalHref('mailto:hello@example.com')).toBe(false);
    });

    it('treats empty / undefined as not internal', () => {
        expect(isInternalHref(undefined)).toBe(false);
        expect(isInternalHref('')).toBe(false);
    });
});

describe('localeFromPathname', () => {
    it('reads the locale segment when present', () => {
        expect(localeFromPathname('/en/terms')).toBe('en');
        expect(localeFromPathname('/en')).toBe('en');
    });

    it('falls back to the default locale otherwise', () => {
        expect(localeFromPathname('/terms')).toBe('de');
        expect(localeFromPathname('/')).toBe('de');
        expect(localeFromPathname(undefined)).toBe('de');
    });
});

describe('localizeInternalHref', () => {
    it('leaves paths untouched for the default locale', () => {
        expect(localizeInternalHref('/terms', 'de')).toBe('/terms');
        expect(localizeInternalHref('/', 'de')).toBe('/');
    });

    it('prefixes the locale for non-default locales', () => {
        expect(localizeInternalHref('/terms', 'en')).toBe('/en/terms');
        expect(localizeInternalHref('/', 'en')).toBe('/en');
    });

    it('does not double-prefix a path that already carries a locale', () => {
        expect(localizeInternalHref('/en/terms', 'en')).toBe('/en/terms');
    });
});
