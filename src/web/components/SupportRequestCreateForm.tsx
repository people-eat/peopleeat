import { useForm } from '@tanstack/react-form';
import { format, parseISO } from 'date-fns';
import { de as deLocale, enUS } from 'date-fns/locale';
import { PaperclipIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useMutation } from 'urql';

import { useComposerFileAttachments } from '../chat/useComposerFileAttachments';
import { ProfileSupportRequestCreateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { AttachmentGroup } from './base/attachment';
import { Button } from './base/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './base/card';
import { Input } from './base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './base/select';
import { Textarea } from './base/textarea';
import { MessageComposerAttachment } from './message-composer-attachment';

const NO_BOOKING_VALUE = '__none__';

export type SupportRequestCreateBookingOption = {
    bookingRequestId: string;
    occasion: string;
    dateTime: string;
    hasSupportRequest: boolean;
};

export function SupportRequestCreateForm({
    lockedBookingRequestId,
    bookingOptions,
    onCreated,
    onCancel,
}: {
    lockedBookingRequestId?: string;
    bookingOptions?: readonly SupportRequestCreateBookingOption[];
    onCreated: (supportRequestId: string) => void;
    onCancel?: () => void;
}) {
    const locale = useLocale();
    const dateLocale = locale === 'de' ? deLocale : enUS;
    const [, createSupportRequest] = useMutation(ProfileSupportRequestCreateDocument);
    const [submitError, setSubmitError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { attachments, onAttachmentsAdd, onAttachmentRemove, clearAttachments, uploadedFileUploadIds, hasUploading } =
        useComposerFileAttachments();
    const availableBookings = (bookingOptions ?? []).filter((option) => !option.hasSupportRequest);

    const form = useForm({
        defaultValues: {
            subject: '',
            messageBody: '',
            bookingRequestId: lockedBookingRequestId ?? NO_BOOKING_VALUE,
        },
        onSubmit: async ({ value }) => {
            setSubmitError(false);
            const subject = value.subject.trim();
            const messageBody = value.messageBody.trim();
            if (subject.length === 0 || messageBody.length === 0 || hasUploading) {
                setSubmitError(true);
                return;
            }

            const bookingRequestId =
                lockedBookingRequestId ?? (value.bookingRequestId === NO_BOOKING_VALUE ? null : value.bookingRequestId.trim() || null);
            const result = await createSupportRequest({
                subject,
                messageBody,
                bookingRequestId,
                fileUploadIds: uploadedFileUploadIds.length > 0 ? uploadedFileUploadIds : null,
            });
            const data = result.data;
            const created = data?.user.supportRequestCreate;
            if (result.error || !created?.success || !created.referenceId) {
                setSubmitError(true);
                return;
            }
            form.reset();
            clearAttachments();
            onCreated(created.referenceId);
        },
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>{{ de: 'Neue Support-Anfrage', en: 'New support request' }[locale]}</CardTitle>
                <CardDescription>
                    {
                        {
                            de: 'Beschreibe kurz dein Anliegen. Unser Team meldet sich im Chat.',
                            en: 'Briefly describe your issue. Our team will reply in chat.',
                        }[locale]
                    }
                </CardDescription>
            </CardHeader>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void form.handleSubmit();
                }}
            >
                <CardContent className="grid gap-4">
                    {lockedBookingRequestId == null && availableBookings.length > 0 ? (
                        <form.Field name="bookingRequestId">
                            {(field) => (
                                <div className="grid gap-2">
                                    <label htmlFor={field.name} className="text-sm font-medium">
                                        {{ de: 'Buchungsanfrage (optional)', en: 'Booking request (optional)' }[locale]}
                                    </label>
                                    <Select
                                        value={field.state.value || NO_BOOKING_VALUE}
                                        onValueChange={(value) => field.handleChange(value)}
                                    >
                                        <SelectTrigger id={field.name} className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_BOOKING_VALUE}>
                                                {{ de: 'Keine / Allgemein', en: 'None / General' }[locale]}
                                            </SelectItem>
                                            {availableBookings.map((option) => (
                                                <SelectItem key={option.bookingRequestId} value={option.bookingRequestId}>
                                                    {option.occasion}
                                                    {' · '}
                                                    {format(parseISO(option.dateTime), 'PP', { locale: dateLocale })}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </form.Field>
                    ) : null}
                    <form.Field name="subject">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {{ de: 'Betreff', en: 'Subject' }[locale]}
                                </label>
                                <Input
                                    id={field.name}
                                    value={field.state.value}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="messageBody">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor={field.name} className="text-sm font-medium">
                                    {{ de: 'Nachricht', en: 'Message' }[locale]}
                                </label>
                                <Textarea
                                    id={field.name}
                                    value={field.state.value}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    onBlur={field.handleBlur}
                                    rows={4}
                                    required
                                />
                            </div>
                        )}
                    </form.Field>
                    <div className="grid gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                                <PaperclipIcon className="size-4" />
                                {{ de: 'Datei anhängen', en: 'Attach file' }[locale]}
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                onChange={(event) => {
                                    const files = event.target.files;
                                    if (files && files.length > 0) {
                                        onAttachmentsAdd([...files]);
                                    }
                                    event.target.value = '';
                                }}
                            />
                        </div>
                        {attachments.length > 0 ? (
                            <AttachmentGroup className="flex-wrap">
                                {attachments.map((attachment) => (
                                    <MessageComposerAttachment
                                        key={attachment.localId}
                                        attachment={attachment}
                                        onRemove={() => onAttachmentRemove(attachment.localId)}
                                    />
                                ))}
                            </AttachmentGroup>
                        ) : null}
                    </div>
                    {submitError ? (
                        <p className="text-sm text-destructive">
                            {
                                {
                                    de: 'Anfrage konnte nicht gesendet werden. Bitte versuche es erneut.',
                                    en: 'Could not send the request. Please try again.',
                                }[locale]
                            }
                        </p>
                    ) : null}
                    <div className="flex flex-wrap justify-end gap-2">
                        {onCancel ? (
                            <Button type="button" variant="outline" onClick={onCancel}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                        ) : null}
                        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
                            {([canSubmit, isSubmitting]) => (
                                <Button type="submit" disabled={!canSubmit || isSubmitting || hasUploading}>
                                    {{ de: 'Absenden', en: 'Submit' }[locale]}
                                </Button>
                            )}
                        </form.Subscribe>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
}
