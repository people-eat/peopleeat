import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';
import { BookingRequestOpenToOtherCooksDocument } from '../graphql/generated';
import { useT } from '../hooks/useT';
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
    const { t } = useT('common');
    const [open, setOpen] = useState(false);
    const [{ fetching }, openToOtherCooks] = useMutation(BookingRequestOpenToOtherCooksDocument);
    const label = t('openToOtherCooks.label');

    async function confirm() {
        const result = await openToOtherCooks({ bookingRequestId });
        if (result.error || !result.data?.user.bookingRequestOpenToOtherCooks.success) {
            toast.error(t('openToOtherCooks.failed'));
            return;
        }
        setOpen(false);
        toast.success(t('openToOtherCooks.opened'));
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
                        <AlertDialogTitle>{t('openToOtherCooks.confirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('openToOtherCooks.confirmBody', { cookFirstName })}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={fetching}>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={fetching} onClick={() => void confirm()}>
                            {fetching ? t('openToOtherCooks.opening') : label}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
