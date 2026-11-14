import { useNavigate } from '@tanstack/react-router';
import { HandshakeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/base/tooltip';
import type { GqlCAdminPartnersPageQuery } from '../../graphql/generated';
import {
    AdminPartnerDeleteDocument,
    AdminPartnersPageUpdatesDocument,
    AdminPartnerUpsertDocument,
    AdminPartnerVenueCreateDocument,
} from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminPartnersPageTitle = { de: 'Partner', en: 'Partners' } as const;
export const adminPartnersPageDescription = {
    de: 'Partnerunternehmen und ihre Locations verwalten.',
    en: 'Manage partner companies and their venues.',
} as const;

function draftVenueInput(partnerId: string) {
    return {
        partnerId,
        pathName: `venue-${Date.now()}`,
        name: 'Neue Location',
        titleDe: 'Location mit peopleeat',
        titleEn: '',
        descriptionDe: 'Beschreibung',
        descriptionEn: '',
        headlineDe: 'Gemeinsam genießen',
        headlineEn: '',
        subHeadlineDe: 'Privates Dinner vor Ort',
        subHeadlineEn: '',
        firstSectionHeadlineDe: '',
        firstSectionHeadlineEn: '',
        firstSectionBodyDe: '',
        firstSectionBodyEn: '',
        heroImageOverlay: true,
        firstSectionImageOverlay: true,
        howItWorksAlternativeMedia: false,
        featuredCooksShowCity: true,
        sections: [],
        publishedAt: null,
    };
}

export function AdminPartnersPage({ data }: { data: GqlCAdminPartnersPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsertPartner] = useMutation(AdminPartnerUpsertDocument);
    const [, deletePartner] = useMutation(AdminPartnerDeleteDocument);
    const [, createVenue] = useMutation(AdminPartnerVenueCreateDocument);
    const [busy, setBusy] = useState(false);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);
    const [renamingPartnerId, setRenamingPartnerId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [partnerIdToDelete, setPartnerIdToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminPartnersPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const partners = admin?.partners ?? [];
    const q = debouncedQ.trim().toLowerCase();
    const filteredPartners = q
        ? partners.filter(
              (partner) =>
                  partner.name.toLowerCase().includes(q) ||
                  partner.venues.some((venue) => venue.name.toLowerCase().includes(q) || venue.pathName.toLowerCase().includes(q)),
          )
        : partners;
    const partnerToDelete = partners.find((partner) => partner.partnerId === partnerIdToDelete) ?? null;
    const deleteBlockedHint = {
        de: 'Partner mit Locations können nicht gelöscht werden.',
        en: 'Partners with venues cannot be deleted.',
    }[locale];

    async function createPartnerWithVenue() {
        setBusy(true);
        try {
            const partnerResult = await upsertPartner({ input: { name: 'Neuer Partner' } });
            const partnerId = partnerResult.data?.admin.partnerUpsert.referenceId;
            if (!partnerId || partnerResult.error) throw new Error('create partner failed');
            const venueResult = await createVenue({ input: draftVenueInput(partnerId) });
            const partnerVenueId = venueResult.data?.admin.partnerVenueUpsert.referenceId;
            if (!partnerVenueId || venueResult.error) throw new Error('create venue failed');
            await navigate({
                to: '/{-$locale}/admin/partner-venues/$partnerVenueId',
                params: { partnerVenueId },
            });
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function addVenue(partnerId: string) {
        setBusy(true);
        try {
            const venueResult = await createVenue({ input: draftVenueInput(partnerId) });
            const partnerVenueId = venueResult.data?.admin.partnerVenueUpsert.referenceId;
            if (!partnerVenueId || venueResult.error) throw new Error('create venue failed');
            await navigate({
                to: '/{-$locale}/admin/partner-venues/$partnerVenueId',
                params: { partnerVenueId },
            });
        } catch {
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function savePartnerName() {
        if (!renamingPartnerId) return;
        const trimmed = renameDraft.trim();
        if (!trimmed) {
            toast.error({ de: 'Name darf nicht leer sein.', en: 'Name must not be empty.' }[locale]);
            return;
        }
        setBusy(true);
        try {
            const result = await upsertPartner({ input: { partnerId: renamingPartnerId, name: trimmed } });
            if (result.error || !result.data?.admin.partnerUpsert.success) throw new Error('rename failed');
            setRenamingPartnerId(null);
            toast.success({ de: 'Partner umbenannt.', en: 'Partner renamed.' }[locale]);
        } catch {
            toast.error({ de: 'Umbenennen fehlgeschlagen.', en: 'Could not rename.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function confirmDeletePartner() {
        if (!partnerIdToDelete) return;
        setBusy(true);
        try {
            const result = await deletePartner({ partnerId: partnerIdToDelete });
            if (result.error || !result.data?.admin.partnerDelete.success) throw new Error('delete failed');
            setPartnerIdToDelete(null);
            toast.success({ de: 'Partner gelöscht.', en: 'Partner deleted.' }[locale]);
        } catch {
            toast.error(
                {
                    de: 'Löschen fehlgeschlagen. Partner mit Locations können nicht gelöscht werden.',
                    en: 'Could not delete. Partners with venues cannot be deleted.',
                }[locale],
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-2">
                        <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                            <HandshakeIcon className="size-8 text-muted-foreground" aria-hidden />
                            {adminPartnersPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminPartnersPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createPartnerWithVenue()}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neuer Partner', en: 'New partner' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Partner, Location oder Pfad suchen…', en: 'Search partner, venue, or path…' }[locale]}
                    aria-label={{ de: 'Partner und Locations suchen', en: 'Search partners and venues' }[locale]}
                    className="max-w-sm"
                />
                {partners.length === 0 ? (
                    <div className="grid gap-4 justify-items-start">
                        <p className="text-muted-foreground">{{ de: 'Noch keine Partner.', en: 'No partners yet.' }[locale]}</p>
                        <Button type="button" disabled={busy} onClick={() => void createPartnerWithVenue()}>
                            <PlusIcon className="size-4" />
                            {{ de: 'Neuer Partner', en: 'New partner' }[locale]}
                        </Button>
                    </div>
                ) : filteredPartners.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
                ) : (
                    <ul className="grid gap-6">
                        {filteredPartners.map((partner) => {
                            const deleteBlocked = partner.venues.length > 0;
                            const deleteButton = (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={busy || deleteBlocked}
                                    aria-label={{ de: 'Partner löschen', en: 'Delete partner' }[locale]}
                                    onClick={() => setPartnerIdToDelete(partner.partnerId)}
                                >
                                    <Trash2Icon className="size-4" />
                                </Button>
                            );
                            return (
                                <li key={partner.partnerId} className="grid gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="font-serif text-2xl text-foreground">{partner.name}</h2>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={busy}
                                            aria-label={{ de: 'Partner umbenennen', en: 'Rename partner' }[locale]}
                                            onClick={() => {
                                                setRenamingPartnerId(partner.partnerId);
                                                setRenameDraft(partner.name);
                                            }}
                                        >
                                            <PencilIcon className="size-4" />
                                        </Button>
                                        {deleteBlocked ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="inline-flex">{deleteButton}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>{deleteBlockedHint}</TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            deleteButton
                                        )}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => void addVenue(partner.partnerId)}
                                        >
                                            <PlusIcon className="size-4" />
                                            {{ de: 'Venue hinzufügen', en: 'Add venue' }[locale]}
                                        </Button>
                                    </div>
                                    {partner.venues.length === 0 ? (
                                        <p className="text-muted-foreground">
                                            {{ de: 'Noch keine Locations.', en: 'No venues yet.' }[locale]}
                                        </p>
                                    ) : (
                                        <ul className="grid gap-2">
                                            {partner.venues.map((venue) => (
                                                <li key={venue.partnerVenueId}>
                                                    <AdminOverviewListCardLink
                                                        to="/{-$locale}/admin/partner-venues/$partnerVenueId"
                                                        params={{ partnerVenueId: venue.partnerVenueId }}
                                                        title={
                                                            <>
                                                                {venue.name}
                                                                <Badge variant="outline">
                                                                    {venue.publishedAt
                                                                        ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                                        : { de: 'Entwurf', en: 'Draft' }[locale]}
                                                                </Badge>
                                                            </>
                                                        }
                                                        description={`/${venue.pathName}`}
                                                        meta={formatDate(new Date(venue.updatedAt), { locale, timeZone })}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </main>

            <Dialog
                open={renamingPartnerId != null}
                onOpenChange={(open) => {
                    if (!open && !busy) setRenamingPartnerId(null);
                }}
            >
                <DialogContent showCloseButton className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Partner umbenennen', en: 'Rename partner' }[locale]}</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        aria-label={{ de: 'Partnername', en: 'Partner name' }[locale]}
                        autoFocus
                        disabled={busy}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                void savePartnerName();
                            }
                        }}
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => setRenamingPartnerId(null)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button type="button" disabled={busy || !renameDraft.trim()} onClick={() => void savePartnerName()}>
                            {{ de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={partnerIdToDelete != null}
                onOpenChange={(open) => {
                    if (!open && !busy) setPartnerIdToDelete(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Partner löschen?', en: 'Delete this partner?' }[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {partnerToDelete
                                ? {
                                      de: `„${partnerToDelete.name}“ wird dauerhaft gelöscht.`,
                                      en: `“${partnerToDelete.name}” will be permanently deleted.`,
                                  }[locale]
                                : {
                                      de: 'Dieser Partner wird dauerhaft gelöscht.',
                                      en: 'This partner will be permanently deleted.',
                                  }[locale]}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void confirmDeletePartner()}>
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPathPageChrome>
    );
}
