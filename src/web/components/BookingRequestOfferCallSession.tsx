import type { DocumentInput } from '@urql/core';
import type { ReactNode } from 'react';
import { createContext, useContext, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { useLocale } from '../hooks/useLocale';
import { BookingRequestOfferCallRoom } from './BookingRequestOfferCallPanel';

type CallSession = {
    token: string;
    serverUrl: string;
    participantId: string;
};

export type BookingRequestOfferCallSessionApi = {
    readonly inCall: boolean;
    readonly busy: boolean;
    readonly startOrJoin: (mode: 'create' | 'join', hasLiveRoom: boolean) => Promise<void>;
};

const BookingRequestOfferCallSessionContext = createContext<BookingRequestOfferCallSessionApi | null>(null);

export function useBookingRequestOfferCallSession(): BookingRequestOfferCallSessionApi {
    const value = useContext(BookingRequestOfferCallSessionContext);
    if (value == null) {
        throw new Error('useBookingRequestOfferCallSession must be used within BookingRequestOfferCallSessionProvider');
    }
    return value;
}

function extractCallToken(data: unknown): CallSession | null {
    if (!data || typeof data !== 'object') return null;
    const walk = (value: unknown): CallSession | null => {
        if (!value || typeof value !== 'object') return null;
        const record = value as Record<string, unknown>;
        if (
            typeof record.token === 'string' &&
            typeof record.url === 'string' &&
            typeof record.bookingRequestOfferCallRoomParticipantId === 'string'
        ) {
            return {
                token: record.token,
                serverUrl: record.url,
                participantId: record.bookingRequestOfferCallRoomParticipantId,
            };
        }
        for (const child of Object.values(record)) {
            const found = walk(child);
            if (found) return found;
        }
        return null;
    };
    return walk(data);
}

function mutationSucceeded(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const walk = (value: unknown): boolean | null => {
        if (!value || typeof value !== 'object') return null;
        if ('success' in value && typeof value.success === 'boolean') {
            return value.success;
        }
        for (const child of Object.values(value)) {
            const found = walk(child);
            if (found != null) return found;
        }
        return null;
    };
    return walk(data) === true;
}

export type BookingRequestOfferCallSessionProviderProps = {
    readonly bookingRequestOfferId: string;
    readonly createDocument: DocumentInput;
    readonly joinDocument: DocumentInput;
    readonly leaveDocument: DocumentInput;
    readonly children: ReactNode | ((api: BookingRequestOfferCallSessionApi) => ReactNode);
};

/**
 * Owns the LiveKit join session above offer tabs so switching Offer / Chat / Call
 * does not tear down the room. Keeps `LiveKitRoom` mounted (connect toggled) so
 * starting a call does not remount chat / offer tab state. Pinned-footer controls
 * stay inside the room context while connected.
 */
export function BookingRequestOfferCallSessionProvider({
    bookingRequestOfferId,
    createDocument,
    joinDocument,
    leaveDocument,
    children,
}: BookingRequestOfferCallSessionProviderProps) {
    const locale = useLocale();
    const [, createCall] = useMutation(createDocument);
    const [, joinCall] = useMutation(joinDocument);
    const [, leaveCall] = useMutation(leaveDocument);

    const [session, setSession] = useState<CallSession | null>(null);
    const [busy, setBusy] = useState(false);
    const participantIdRef = useRef<string | null>(null);

    async function startOrJoin(mode: 'create' | 'join', hasLiveRoom: boolean) {
        if (busy || session) return;
        setBusy(true);
        try {
            const result =
                mode === 'join' || hasLiveRoom ? await joinCall({ bookingRequestOfferId }) : await createCall({ bookingRequestOfferId });
            const next = extractCallToken(result.data);
            if (!next) {
                throw new Error('token missing');
            }
            participantIdRef.current = next.participantId;
            setSession(next);
        } catch {
            toast.error(
                {
                    de: 'Anruf konnte nicht gestartet werden.',
                    en: 'Could not start the call.',
                }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    async function onDisconnected() {
        const participantId = participantIdRef.current;
        if (participantId == null) return;
        participantIdRef.current = null;
        setSession(null);
        try {
            const result = await leaveCall({ bookingRequestOfferCallRoomParticipantId: participantId });
            if (!mutationSucceeded(result.data)) {
                throw new Error('leave failed');
            }
        } catch {
            toast.error(
                {
                    de: 'Anruf konnte nicht korrekt beendet werden.',
                    en: 'Could not leave the call cleanly.',
                }[locale],
            );
        }
    }

    const api: BookingRequestOfferCallSessionApi = {
        inCall: session != null,
        busy,
        startOrJoin,
    };

    const content = typeof children === 'function' ? children(api) : children;

    return (
        <BookingRequestOfferCallSessionContext.Provider value={api}>
            <BookingRequestOfferCallRoom
                token={session?.token}
                serverUrl={session?.serverUrl}
                connect={session != null}
                onDisconnected={() => void onDisconnected()}
            >
                {content}
            </BookingRequestOfferCallRoom>
        </BookingRequestOfferCallSessionContext.Provider>
    );
}
