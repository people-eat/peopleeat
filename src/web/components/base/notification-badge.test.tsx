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

    it('renders nothing when count is zero', () => {
        const { container } = render(<NotificationBadge count={0} label="0 unread notifications" />);

        expect(container.querySelector('[data-slot="notification-badge"]')).toBeNull();
    });
});
