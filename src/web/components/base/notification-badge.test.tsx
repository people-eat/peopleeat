import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NotificationBadge } from './notification-badge';

describe('NotificationBadge', () => {
    it('renders the count when positive', () => {
        render(<NotificationBadge count={4} label="4 unread notifications" />);

        const badge = screen.getByLabelText('4 unread notifications');
        expect(badge.textContent).toBe('4');
        expect(badge.getAttribute('data-slot')).toBe('notification-badge');
        expect(badge.getAttribute('data-placement')).toBe('corner');
    });

    it('marks inline placement for sidebar use', () => {
        render(<NotificationBadge count={2} label="2 unread" placement="inline" />);

        expect(screen.getByLabelText('2 unread').getAttribute('data-placement')).toBe('inline');
    });

    it('stays circular for a single digit', () => {
        render(<NotificationBadge count={9} label="9 unread" placement="inline" />);

        expect(screen.getByLabelText('9 unread').className).not.toMatch(/\bpx-/);
    });

    it('adds horizontal padding so two+ digits become a pill', () => {
        const { rerender } = render(<NotificationBadge count={10} label="10 unread" placement="inline" />);

        expect(screen.getByLabelText('10 unread').className).toMatch(/\bpx-1\b/);

        rerender(<NotificationBadge count={18} label="18 unread" />);

        expect(screen.getByLabelText('18 unread').className).toMatch(/\bpx-1\.5\b/);
    });

    it('renders nothing when count is zero', () => {
        const { container } = render(<NotificationBadge count={0} label="0 unread notifications" />);

        expect(container.querySelector('[data-slot="notification-badge"]')).toBeNull();
    });
});
