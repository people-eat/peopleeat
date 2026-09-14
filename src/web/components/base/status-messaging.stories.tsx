import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { NotificationBadge } from './notification-badge';
import type { StatusTone } from './status';
import { StatusAlert } from './status-alert';
import { StatusBadge } from './status-badge';
import { StatusIcon } from './status-icon';

const tones: StatusTone[] = ['info', 'success', 'warning', 'error'];

const meta = {
    title: 'Base/Status messaging',
    parameters: { layout: 'padded' },
    tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Icons: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-4">
            {tones.map((tone) => (
                <div key={tone} className="flex flex-col items-center gap-2">
                    <StatusIcon tone={tone} />
                    <span className="text-xs text-muted-foreground">{tone}</span>
                </div>
            ))}
        </div>
    ),
};

export const Badges: Story = {
    render: () => (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                {tones.map((tone) => (
                    <StatusBadge key={tone} tone={tone} label={tone} />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <StatusBadge tone="info">Pending</StatusBadge>
                <StatusBadge tone="success">Ready</StatusBadge>
                <StatusBadge tone="warning">Incomplete</StatusBadge>
                <StatusBadge tone="error">Failed</StatusBadge>
            </div>
        </div>
    ),
};

export const Alerts: Story = {
    render: () => (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
            <StatusAlert tone="info" title="Approval pending">
                Your profile must be approved before you can continue.
            </StatusAlert>
            <StatusAlert tone="success" title="Wallet connected">
                Payouts are ready. You can open the Stripe dashboard anytime.
            </StatusAlert>
            <StatusAlert tone="warning" title="2 courses are incomplete">
                Every course needs at least one meal before publishing.
            </StatusAlert>
            <StatusAlert
                tone="error"
                title="Could not save changes"
                action={
                    <Button type="button" size="sm" variant="outline">
                        Try again
                    </Button>
                }
            >
                Check your connection and try again.
            </StatusAlert>
        </div>
    ),
};

export const NavAttention: Story = {
    name: 'Nav attention (sidebar)',
    render: () => (
        <div className="flex w-56 flex-col gap-1 rounded-xl border bg-sidebar p-2">
            <div className="relative flex items-center gap-2 rounded-md p-2 text-sm">
                <span>Wallet</span>
                <span className="absolute right-1">
                    <StatusBadge tone="warning" label="Wallet setup incomplete" />
                </span>
            </div>
            <div className="relative flex items-center gap-2 rounded-md bg-sidebar-accent p-2 text-sm text-sidebar-accent-foreground">
                <span>Wallet (selected)</span>
                <span className="absolute right-1">
                    <StatusBadge tone="warning" label="Wallet setup incomplete" />
                </span>
            </div>
            <div className="relative flex items-center gap-2 rounded-md p-2 text-sm">
                <span>Offers</span>
                <span className="absolute right-1">
                    <NotificationBadge count={3} label="3 unread notifications" placement="inline" />
                </span>
            </div>
        </div>
    ),
};

export const NotificationBadges: Story = {
    name: 'Notification badges (cards)',
    render: () => (
        <div className="flex flex-wrap gap-8">
            {[1, 2, 10, 100].map((count) => (
                <div key={count} className="relative size-40 rounded-xl bg-muted">
                    <NotificationBadge count={count} label={`${count} unread notifications`} />
                </div>
            ))}
        </div>
    ),
};
