import { Link, notFound, useNavigate } from '@tanstack/react-router';
import { CheckIcon, MessageSquareIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDateTime, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { BookingRequestOfferChat } from '../../components/BookingRequestOfferChat';
import type { GqlCAdminOfferChatReviewPageOfferFragment, GqlCAdminOfferChatReviewPageQuery } from '../../graphql/generated';
import {
    AdminBookingRequestOfferChatReviewAcknowledgeDocument,
    AdminOfferChatReviewChatMessageDeleteDocument,
    AdminOfferChatReviewChatMessageReactionUpsertDocument,
    AdminOfferChatReviewChatMessageUpdateDocument,
    AdminOfferChatReviewChatMessageVisibilityUpdateDocument,
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
    const [, acknowledge] = useMutation(AdminBookingRequestOfferChatReviewAcknowledgeDocument);
    const [, upsertOfferChatReaction] = useMutation(AdminOfferChatReviewChatMessageReactionUpsertDocument);
    const [, updateChatMessage] = useMutation(AdminOfferChatReviewChatMessageUpdateDocument);
    const [, updateChatMessageVisibility] = useMutation(AdminOfferChatReviewChatMessageVisibilityUpdateDocument);
    const [, deleteChatMessage] = useMutation(AdminOfferChatReviewChatMessageDeleteDocument);

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

    const respondInOfferLabel = { de: 'Im Angebot antworten', en: 'Respond in offer' }[locale];
    const confirmLabel = { de: 'Bestätigen', en: 'Confirm' }[locale];

    return (
        <AdminPageChrome
            crumbs={[{ label: adminOfferChatReviewsPageTitle[locale], to: '/{-$locale}/admin/offer-chat-reviews' }, { label: cookLabel }]}
            contentClassName="min-h-0 overflow-hidden gap-0 pb-0"
        >
            <AdminPinnedFooterLayout
                contentScroll={false}
                contentClassName="flex w-full min-w-0 flex-col pb-0"
                footer={
                    <div className="flex w-full gap-3 md:justify-end">
                        <Button type="button" variant="outline" className="flex-1 md:flex-initial" asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                                params={{
                                    bookingRequestId: offer.bookingRequestId,
                                    bookingRequestOfferId: offer.bookingRequestOfferId,
                                }}
                                search={{ tab: 'chat' }}
                            >
                                <MessageSquareIcon data-icon="inline-start" />
                                {respondInOfferLabel}
                            </Link>
                        </Button>
                        <Button
                            type="button"
                            className="flex-1 md:flex-initial"
                            onClick={() => void onAcknowledge()}
                            disabled={acknowledging}
                        >
                            <CheckIcon data-icon="inline-start" />
                            {confirmLabel}
                        </Button>
                    </div>
                }
            >
                <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 px-4 pb-1 text-sm text-muted-foreground">
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
                    <span aria-hidden>·</span>
                    <span>{pendingHint}</span>
                </div>

                <BookingRequestOfferChat
                    className="min-h-0 min-w-0 flex-1 overflow-hidden"
                    messages={offer.messages}
                    canSend={false}
                    peers={[
                        {
                            display: customerLabel,
                            profilePictureUrl: request.customer.profilePicture?.url,
                            userId: request.customer.userId,
                        },
                        {
                            display: cookLabel,
                            profilePictureUrl: offer.cook.user.profilePicture?.url,
                            userId: offer.cook.user.userId,
                        },
                    ]}
                    viewerRole="admin"
                    onSend={async () => false}
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
                    onVisibilityChangeMessage={async (chatMessageId, hiddenByAdmin) => {
                        const result = await updateChatMessageVisibility({
                            bookingRequestOfferEventId: chatMessageId,
                            hiddenByAdmin,
                        });
                        if (result.error || !result.data?.admin.bookingRequestOfferChatMessageVisibilityUpdate.success) {
                            toast.error(
                                hiddenByAdmin
                                    ? {
                                          de: 'Nachricht konnte nicht verborgen werden.',
                                          en: 'Could not hide the message.',
                                      }[locale]
                                    : {
                                          de: 'Nachricht konnte nicht wieder angezeigt werden.',
                                          en: 'Could not show the message again.',
                                      }[locale],
                            );
                            return false;
                        }
                        return true;
                    }}
                    onDeleteMessage={async (chatMessageId) => {
                        const result = await deleteChatMessage({
                            bookingRequestOfferEventId: chatMessageId,
                        });
                        if (result.error || !result.data?.admin.bookingRequestOfferChatMessageDelete.success) {
                            toast.error(
                                {
                                    de: 'Nachricht konnte nicht gelöscht werden.',
                                    en: 'Could not delete the message.',
                                }[locale],
                            );
                            return false;
                        }
                        return true;
                    }}
                    onReactMessage={async (chatMessageId, emoji) => {
                        const result = await upsertOfferChatReaction({
                            bookingRequestOfferEventId: chatMessageId,
                            emoji,
                        });
                        if (result.error || !result.data?.admin.bookingRequestOfferChatMessageReactionUpsert.success) {
                            toast.error(
                                {
                                    de: 'Reaktion konnte nicht gespeichert werden.',
                                    en: 'Could not save the reaction.',
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
