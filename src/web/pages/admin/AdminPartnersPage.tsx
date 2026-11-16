import { useNavigate } from '@tanstack/react-router';
import { HandshakeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDate, inlineCopy } from '../../../shared';
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
import type { Locale } from '../../utils/locale';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export function adminPartnersPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.partners.title');
}
export function adminPartnersPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.partners.description');
}

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
    const deleteBlockedHint = t(locale, 'admin', 'copy.partnersWithVenuesCannotBeDeleted');

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
            toast.error(t(locale, 'admin', 'copy.couldNotCreate'));
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
            toast.error(t(locale, 'admin', 'copy.couldNotCreate'));
        } finally {
            setBusy(false);
        }
    }

    async function savePartnerName() {
        if (!renamingPartnerId) return;
        const trimmed = renameDraft.trim();
        if (!trimmed) {
            toast.error(t(locale, 'admin', 'copy.nameMustNotBeEmpty'));
            return;
        }
        setBusy(true);
        try {
            const result = await upsertPartner({ input: { partnerId: renamingPartnerId, name: trimmed } });
            if (result.error || !result.data?.admin.partnerUpsert.success) throw new Error('rename failed');
            setRenamingPartnerId(null);
            toast.success(t(locale, 'admin', 'copy.partnerRenamed'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotRename'));
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
            toast.success(t(locale, 'admin', 'copy.partnerDeleted'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotDeletePartnersWithVenuesCannotBeDeleted'));
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
                            {adminPartnersPageTitle(locale)}
                        </h1>
                        <p className="text-muted-foreground">{adminPartnersPageDescription(locale)}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createPartnerWithVenue()}>
                        <PlusIcon className="size-4" />
                        {t(locale, 'admin', 'copy.newPartner')}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'admin', 'copy.searchPartnerVenueOrPath')}
                    aria-label={t(locale, 'admin', 'copy.searchPartnersAndVenues')}
                    className="max-w-sm"
                />
                {partners.length === 0 ? (
                    <div className="grid gap-4 justify-items-start">
                        <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noPartnersYet')}</p>
                        <Button type="button" disabled={busy} onClick={() => void createPartnerWithVenue()}>
                            <PlusIcon className="size-4" />
                            {t(locale, 'admin', 'copy.newPartner')}
                        </Button>
                    </div>
                ) : filteredPartners.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noMatches')}</p>
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
                                    aria-label={t(locale, 'admin', 'copy.deletePartner')}
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
                                            aria-label={t(locale, 'admin', 'copy.renamePartner')}
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
                                            {t(locale, 'admin', 'copy.addVenue')}
                                        </Button>
                                    </div>
                                    {partner.venues.length === 0 ? (
                                        <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noVenuesYet')}</p>
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
                                                                        ? t(locale, 'admin', 'copy.published2')
                                                                        : t(locale, 'admin', 'copy.draft')}
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
                        <DialogTitle>{t(locale, 'admin', 'copy.renamePartner')}</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        aria-label={t(locale, 'admin', 'copy.partnerName')}
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
                            {t(locale, 'admin', 'copy.cancel')}
                        </Button>
                        <Button type="button" disabled={busy || !renameDraft.trim()} onClick={() => void savePartnerName()}>
                            {t(locale, 'admin', 'copy.save')}
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
                        <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteThisPartner')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {partnerToDelete
                                ? inlineCopy(
                                      {
                                          de: `„${partnerToDelete.name}“ wird dauerhaft gelöscht.`,
                                          en: `“${partnerToDelete.name}” will be permanently deleted.`,
                                      },
                                      locale,
                                  )
                                : t(locale, 'admin', 'copy.thisPartnerWillBePermanentlyDeleted')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void confirmDeletePartner()}>
                            {t(locale, 'admin', 'copy.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminPathPageChrome>
    );
}
