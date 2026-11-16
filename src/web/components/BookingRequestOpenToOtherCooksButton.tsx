import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';
import { inlineCopy } from '../../shared';

import { BookingRequestOpenToOtherCooksDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';

export function BookingRequestOpenToOtherCooksButton({
    bookingRequestId,
    cookFirstName,
    prominence,
}: {
    bookingRequestId: string;
    cookFirstName: string;
    prominence: 'primary' | 'secondary';
}) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [{ fetching }, openToOtherCooks] = useMutation(BookingRequestOpenToOtherCooksDocument);
    const label = inlineCopy({ de: 'Auch Angebote von anderen Köchen erhalten', en: 'Also get offers from other chefs' }, locale);

    async function confirm() {
        const result = await openToOtherCooks({ bookingRequestId });
        if (result.error || !result.data?.user.bookingRequestOpenToOtherCooks.success) {
            toast.error(
                inlineCopy({ de: 'Anfrage konnte nicht geöffnet werden.', en: 'Could not open the request to other chefs.' }, locale),
            );
            return;
        }
        setOpen(false);
        toast.success(
            inlineCopy(
                {
                    de: 'Deine Anfrage ist jetzt auch für andere Köche offen.',
                    en: 'Your request is now also open to other chefs.',
                },
                locale,
            ),
        );
    }

    return (
        <>
            <Button
                type="button"
                variant={prominence === 'primary' ? 'default' : 'outline'}
                disabled={fetching}
                onClick={() => setOpen(true)}
            >
                {label}
            </Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {inlineCopy({ de: 'Auch andere Köche anfragen?', en: 'Ask other chefs too?' }, locale)}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {inlineCopy(
                                {
                                    de: `Köche in deiner Nähe erhalten die Anfrage ebenfalls. ${cookFirstName} bleibt darauf.`,
                                    en: `Chefs nearby will also receive this request. ${cookFirstName} stays on it.`,
                                },
                                locale,
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={fetching}>{inlineCopy({ de: 'Abbrechen', en: 'Cancel' }, locale)}</AlertDialogCancel>
                        <AlertDialogAction disabled={fetching} onClick={() => void confirm()}>
                            {fetching ? inlineCopy({ de: 'Wird geöffnet…', en: 'Opening…' }, locale) : label}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
