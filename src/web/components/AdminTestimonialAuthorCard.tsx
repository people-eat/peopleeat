import { Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';

import { userDisplayName } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { AdminTestimonialOfferLink } from './AdminTestimonialOfferLink';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Card, CardContent } from './base/card';

export type AdminTestimonialAuthorCardUser = {
    userId: string;
    firstName: string;
    lastName: string;
    emailAddress: string | null;
    profilePictureUrl?: string | null;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

/** Dedicated author identity card on admin testimonial detail pages. */
export function AdminTestimonialAuthorCard({
    user,
    role,
    bookingRequestOfferId,
}: {
    user: AdminTestimonialAuthorCardUser;
    role: 'customer' | 'cook';
    bookingRequestOfferId?: string | null;
}) {
    const locale = useLocale();
    const name = userDisplayName(user);
    const roleLabel = role === 'customer' ? { de: 'Kunde', en: 'Customer' }[locale] : { de: 'Koch', en: 'Cook' }[locale];

    return (
        <div className="grid gap-2">
            <h2 className="text-sm font-medium text-foreground">{{ de: 'Autor', en: 'Author' }[locale]}</h2>
            <Card className="gap-0 py-4">
                <CardContent className="grid gap-3 px-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <Avatar className="size-12 shrink-0">
                                {user.profilePictureUrl ? (
                                    <AvatarImage src={user.profilePictureUrl} alt="" className="object-cover" />
                                ) : null}
                                <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
                            </Avatar>
                            <div className="grid min-w-0 flex-1 gap-0.5">
                                <p className="truncate font-medium text-foreground">{name}</p>
                                {user.emailAddress ? <p className="truncate text-sm text-muted-foreground">{user.emailAddress}</p> : null}
                            </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                            {roleLabel}
                        </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link to="/{-$locale}/admin/users/$userId" params={{ userId: user.userId }}>
                                <ExternalLinkIcon data-icon="inline-start" />
                                {{ de: 'Nutzer öffnen', en: 'Open user' }[locale]}
                            </Link>
                        </Button>
                        {bookingRequestOfferId ? (
                            <AdminTestimonialOfferLink bookingRequestOfferId={bookingRequestOfferId} />
                        ) : (
                            <span className="text-sm text-muted-foreground">
                                {{ de: 'Kein Angebot verknüpft', en: 'No offer linked' }[locale]}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
