import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CheckIcon, ExternalLinkIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { bookingRequestOfferChatCanSend, formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import type { GqlCAdminOfferChatReviewPageOfferFragment, GqlCAdminOfferChatReviewPageQuery } from '../../graphql/generated';
import {
    AdminBookingRequestOfferChatReviewAcknowledgeDocument,
    AdminOfferChatReviewChatMessageCreateDocument,
    AdminOfferChatReviewChatMessageUpdateDocument,
    AdminOfferChatReviewPageUpdatesDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminBookingRequestCustomerLabel } from './adminBookingRequestsColumns';
import { adminOfferChatReviewsPageTitle } from './AdminOfferChatReviewsPage';

export const adminOfferChatReviewPageTitle = {
    de: 'Angebots-Chat prüfen',
    en: 'Review offer chat',
} as const;
export const adminOfferChatReviewPageDescription = {
    de: 'Gespräch prüfen und bestätigen.',
    en: 'Review the conversation and acknowledge.',
} as const;

export function adminOfferChatReviewPageVariables(bookingRequestOfferId: string) {
    return { bookingRequestOfferId };
}

export function AdminOfferChatReviewPage({
    data,
    bookingRequestOfferId,
}: {
    data: GqlCAdminOfferChatReviewPageQuery;
    bookingRequestOfferId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const client = useClient();
    const navigate = useNavigate();
    const seedOffer = data.currentSession.user?.admin?.bookingRequestOffer ?? null;
    if (!seedOffer) throw notFound();

    const [offer, setOffer] = useState<GqlCAdminOfferChatReviewPageOfferFragment>(seedOffer);
    const [acknowledging, setAcknowledging] = useState(false);
    const [composerHost, setComposerHost] = useState<HTMLDivElement | null>(null);
    const [, acknowledge] = useMutation(AdminBookingRequestOfferChatReviewAcknowledgeDocument);
    const [, sendChatMessage] = useMutation(AdminOfferChatReviewChatMessageCreateDocument);
    const [, updateChatMessage] = useMutation(AdminOfferChatReviewChatMessageUpdateDocument);

    useEffect(() => {
        setOffer(seedOffer);
    }, [seedOffer]);

    useEffect(() => {
        const request = createRequest(AdminOfferChatReviewPageUpdatesDocument, { bookingRequestOfferId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.bookingRequestOffer;
                if (next) setOffer(next);
            }),
        );
        return unsubscribe;
    }, [client, bookingRequestOfferId]);

    const request = offer.bookingRequest;
    const customerLabel = adminBookingRequestCustomerLabel(request.customer);
    const cookLabel = userDisplayName(offer.cook.user);
    const canSend = bookingRequestOfferChatCanSend(offer.status);
    const pendingCount = offer.adminChatReviewPendingCount;

    async function onAcknowledge() {
        if (acknowledging) return;
        setAcknowledging(true);
        try {
            const result = await acknowledge({ bookingRequestOfferId });
            const payload = result.data?.admin.bookingRequestOfferChatReviewAcknowledge;
            if (result.error || !payload) {
                toast.error(
                    {
                        de: 'Bestätigung fehlgeschlagen.',
                        en: 'Could not acknowledge.',
                    }[locale],
                );
                return;
            }
            if (payload.nextOfferId) {
                await navigate({
                    to: '/{-$locale}/admin/offer-chat-reviews/$bookingRequestOfferId',
                    params: { bookingRequestOfferId: payload.nextOfferId },
                    replace: true,
                });
                return;
            }
            await navigate({ to: '/{-$locale}/admin/offer-chat-reviews', replace: true });
        } finally {
            setAcknowledging(false);
        }
    }

    const pendingHint =
        pendingCount > 0
            ? {
                  de:
                      pendingCount === 1
                          ? '1 neue Nachricht seit der letzten Prüfung.'
                          : `${pendingCount} neue Nachrichten seit der letzten Prüfung.`,
                  en: pendingCount === 1 ? '1 new message since last review.' : `${pendingCount} new messages since last review.`,
              }[locale]
            : {
                  de: 'Keine ausstehenden Nachrichten. Du kannst trotzdem bestätigen und weitergehen.',
                  en: 'No pending messages. You can still acknowledge and continue.',
              }[locale];

    return (
        <AdminPageChrome
            crumbs={[{ label: adminOfferChatReviewsPageTitle[locale], to: '/{-$locale}/admin/offer-chat-reviews' }, { label: cookLabel }]}
            contentClassName="min-h-0 overflow-hidden gap-0 pb-0"
        >
            <AdminPinnedFooterLayout
                contentScroll={false}
                contentClassName="flex w-full min-w-0 flex-col pb-0"
                footer={
                    <div className="grid w-full gap-3">
                        {canSend ? <div ref={setComposerHost} className="min-w-0" /> : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">{pendingHint}</p>
                            <Button type="button" onClick={() => void onAcknowledge()} disabled={acknowledging}>
                                <CheckIcon data-icon="inline-start" />
                                {{ de: 'Bestätigen und weiter', en: 'Acknowledge and next' }[locale]}
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="grid shrink-0 gap-2 px-4 pb-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid min-w-0 gap-1">
                            <h1 className="font-serif text-2xl/tight text-foreground">{adminOfferChatReviewPageTitle[locale]}</h1>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span>{customerLabel}</span>
                                <span aria-hidden>·</span>
                                <span>{cookLabel}</span>
                                <span aria-hidden>·</span>
                                <span>{request.occasion}</span>
                                <span aria-hidden>·</span>
                                <span>
                                    {formatDateTime(request.dateTime, {
                                        locale,
                                        timeZone,
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </span>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                params={{
                                    bookingRequestId: offer.bookingRequestId,
                                    bookingRequestOfferId: offer.bookingRequestOfferId,
                                }}
                                search={{ tab: 'chat' }}
                            >
                                <ExternalLinkIcon data-icon="inline-start" />
                                {{ de: 'Angebot öffnen', en: 'Open offer' }[locale]}
                            </Link>
                        </Button>
                    </div>
                </div>

                <BookingRequestOfferChat
                    className="min-h-0 min-w-0 flex-1 px-4"
                    messages={offer.messages}
                    canSend={canSend}
                    externalComposer
                    composerHost={composerHost}
                    peers={[
                        {
                            display: customerLabel,
                            profilePictureUrl: request.customer.profilePicture?.url,
                        },
                        {
                            display: cookLabel,
                            profilePictureUrl: offer.cook.user.profilePicture?.url,
                        },
                    ]}
                    viewerRole="admin"
                    onSend={async (message, fileUploadIds) => {
                        const result = await sendChatMessage({ bookingRequestOfferId, message, fileUploadIds });
                        if (result.error || !result.data?.admin.bookingRequestOfferChatMessageCreate.success) {
                            toast.error(
                                {
                                    de: 'Nachricht konnte nicht gesendet werden.',
                                    en: 'Could not send the message.',
                                }[locale],
                            );
                            return false;
                        }
                        return true;
                    }}
                    onEditMessage={async (chatMessageId, message) => {
                        const result = await updateChatMessage({
                            bookingRequestOfferEventId: chatMessageId,
                            message,
                        });
                        if (result.error || !result.data?.admin.bookingRequestOfferChatMessageUpdate.success) {
                            toast.error(
                                {
                                    de: 'Nachricht konnte nicht gespeichert werden.',
                                    en: 'Could not save the message.',
                                }[locale],
                            );
                            return false;
                        }
                        return true;
                    }}
                />
            </AdminPinnedFooterLayout>
        </AdminPageChrome>
    );
}
