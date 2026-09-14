import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { statusIcons } from './status';
import { StatusAlert } from './status-alert';
import { StatusBadge } from './status-badge';
import { StatusIcon } from './status-icon';

describe('status messaging', () => {
    it('exposes one Lucide icon per tone', () => {
        expect(Object.keys(statusIcons).sort()).toEqual(['error', 'info', 'success', 'warning']);
    });

    it('renders StatusIcon with tone data attribute', () => {
        const { container } = render(<StatusIcon tone="warning" />);
        const icon = container.querySelector('[data-slot="status-icon"]');
        expect(icon).not.toBeNull();
        expect(icon?.getAttribute('data-tone')).toBe('warning');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders icon-only StatusBadge with accessible label', () => {
        render(<StatusBadge tone="warning" label="Wallet setup incomplete" />);
        expect(screen.getByRole('img', { name: 'Wallet setup incomplete' })).toBeTruthy();
    });

    it('renders labeled StatusBadge without img role', () => {
        render(<StatusBadge tone="warning">Incomplete</StatusBadge>);
        expect(screen.getByText('Incomplete')).toBeTruthy();
        expect(screen.queryByRole('img')).toBeNull();
    });

    it('uses status role for non-error StatusAlert and alert for errors', () => {
        const { rerender } = render(
            <StatusAlert tone="warning" title="Incomplete">
                Finish setup.
            </StatusAlert>,
        );
        expect(screen.getByRole('status')).toBeTruthy();

        rerender(
            <StatusAlert tone="error" title="Failed">
                Try again.
            </StatusAlert>,
        );
        expect(screen.getByRole('alert')).toBeTruthy();
    });

    it('renders StatusAlert action outside the muted description', () => {
        const { container } = render(
            <StatusAlert tone="info" title="Next?" action={<button type="button">Start</button>}>
                Body copy.
            </StatusAlert>,
        );
        const description = container.querySelector('[data-slot="alert-description"]');
        const action = container.querySelector('[data-slot="status-alert-action"]');
        const copy = container.querySelector('[data-slot="status-alert-copy"]');
        expect(description?.textContent).toBe('Body copy.');
        expect(action?.contains(screen.getByRole('button', { name: 'Start' }))).toBe(true);
        expect(description?.contains(action)).toBe(false);
        expect(copy?.contains(description)).toBe(true);
        expect(copy?.contains(action)).toBe(false);
        expect(action?.className).toContain('shrink-0');
        expect(action?.className).toContain('sm:mt-0');
        expect(container.querySelector('[data-slot="status-alert-body"]')?.className).toContain('sm:flex-row');
    });

    it('centers body-only StatusAlert and keeps stacked title+body top-aligned', () => {
        const { container, rerender } = render(<StatusAlert tone="success">Within range.</StatusAlert>);
        expect(container.querySelector('[data-slot="status-alert"]')?.className).toContain('items-center');

        rerender(
            <StatusAlert tone="warning" title="Incomplete">
                Finish setup.
            </StatusAlert>,
        );
        expect(container.querySelector('[data-slot="status-alert"]')?.className).not.toContain('items-center');
        expect(container.querySelector('[data-slot="status-alert-body"]')?.className).toContain('flex-col');
        expect(container.querySelector('[data-slot="status-alert-copy"]')?.className).toContain('gap-0.5');
    });

    it('centers title-only StatusAlert even when an action is present', () => {
        const { container } = render(<StatusAlert tone="info" title="Next?" action={<button type="button">Start</button>} />);
        expect(container.querySelector('[data-slot="status-alert"]')?.className).toContain('items-center');
    });

    it('keeps inline markup inside StatusAlert description in normal flow', () => {
        const { container } = render(
            <StatusAlert tone="success" title="Discount secured">
                Your benefit of <span className="font-semibold">€50</span> is secured.
            </StatusAlert>,
        );
        const description = container.querySelector('[data-slot="alert-description"]');
        expect(description?.className).not.toContain('grid');
        expect(description?.className).toContain('leading-snug');
        expect(description?.textContent).toBe('Your benefit of €50 is secured.');
        expect(container.querySelector('[data-slot="status-alert-body"]')?.contains(description)).toBe(true);
    });
});
