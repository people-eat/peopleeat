import { Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import type { Locale } from '../utils/locale';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Card, CardContent } from './base/card';

export type AdminOfferPartyCardPerson = {
    userId: string;
    displayName: string;
    emailAddress: string | null;
    profilePictureUrl: string | null;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

function AdminOfferPartyCard({
    person,
    roleLabel,
    openUserLabel,
}: {
    person: AdminOfferPartyCardPerson;
    roleLabel: string;
    openUserLabel: string;
}) {
    return (
        <Card className="gap-0 py-4">
            <CardContent className="grid gap-3 px-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <Avatar className="size-12 shrink-0">
                            {person.profilePictureUrl ? (
                                <AvatarImage src={person.profilePictureUrl} alt="" className="object-cover" />
                            ) : null}
                            <AvatarFallback>{initialsFromName(person.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="grid min-w-0 flex-1 gap-0.5">
                            <p className="truncate font-medium text-foreground">{person.displayName}</p>
                            {person.emailAddress ? <p className="truncate text-sm text-muted-foreground">{person.emailAddress}</p> : null}
                        </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                        {roleLabel}
                    </Badge>
                </div>
                <div>
                    <Button type="button" variant="outline" size="sm" asChild>
                        <Link to="/{-$locale}/admin/users/$userId" params={{ userId: person.userId }}>
                            <ExternalLinkIcon data-icon="inline-start" />
                            {openUserLabel}
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

/** Cook + customer identity cards shared by the admin offer tab and call detail. */
export function AdminOfferPartyCards({
    cook,
    customer,
    locale,
}: {
    cook: AdminOfferPartyCardPerson;
    customer: AdminOfferPartyCardPerson | null;
    locale: Locale;
}) {
    const openUserLabel = { de: 'Nutzer öffnen', en: 'Open user' }[locale];

    return (
        <div className="grid items-start gap-4 @2xl:grid-cols-2">
            <AdminOfferPartyCard person={cook} roleLabel={{ de: 'Koch', en: 'Cook' }[locale]} openUserLabel={openUserLabel} />
            {customer ? (
                <AdminOfferPartyCard person={customer} roleLabel={{ de: 'Kunde', en: 'Customer' }[locale]} openUserLabel={openUserLabel} />
            ) : null}
        </div>
    );
}
