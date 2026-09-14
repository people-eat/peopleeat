import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '../utils/cn';
import { Button } from './base/button';
import { statusBadgeToneClass } from './base/status';
import { StatusIcon } from './base/status-icon';

type OfferAttentionActionLink =
    | {
          to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId';
          params: { bookingRequestId: string; bookingRequestOfferId: string };
          search?: { tab: 'call' };
      }
    | {
          to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout';
          params: { bookingRequestId: string; bookingRequestOfferId: string };
      }
    | {
          to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId';
          params: { bookingRequestOfferId: string };
          search?: { tab: 'call' };
      }
    | {
          to: '/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId';
          params: { bookingRequestId: string; bookingRequestOfferId: string };
          search?: { tab: 'call' };
      };

export type BookingRequestOfferAttentionBannerProps = {
    message: ReactNode;
    actionLabel: ReactNode;
    /** When set, shows a compact CTA. Omit when already on the target surface. */
    actionLink?: OfferAttentionActionLink;
    className?: string;
};

/** One-line attention strip for offer headers — keeps `grid-rows-[auto_1fr]` intact. */
export function BookingRequestOfferAttentionBanner({
    message,
    actionLabel,
    actionLink,
    className,
}: BookingRequestOfferAttentionBannerProps) {
    return (
        <div
            role="status"
            data-slot="booking-request-offer-attention-banner"
            className={cn(
                // Fixed h-11 + reserved h-8 action slot so CTA presence cannot shift layout.
                'flex h-11 min-w-0 items-center gap-2 rounded-md border px-2.5 text-sm',
                statusBadgeToneClass.warning,
                className,
            )}
        >
            <StatusIcon tone="warning" size="sm" />
            <p className="min-w-0 flex-1 truncate font-medium text-foreground">{message}</p>
            <div className="flex h-8 shrink-0 items-center justify-end">
                {actionLink ? (
                    <Button type="button" size="sm" className="shrink-0" asChild>
                        <Link {...actionLink} replace>
                            {actionLabel}
                        </Link>
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
