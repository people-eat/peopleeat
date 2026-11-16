import { XIcon } from 'lucide-react';
import type { RefObject } from 'react';
import { useRef, useState } from 'react';

import { t } from '../../i18n/t';
import {
    BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX,
    bookingRequestKitchenDetailsAvailabilities,
    bookingRequestKitchenDetailsAvailabilityLabel,
    bookingRequestKitchenDetailsDraftIsEmpty,
    bookingRequestKitchenDetailsGuestTablewareLabel,
    bookingRequestKitchenDetailsGuestTablewareValues,
    bookingRequestKitchenDetailsSpaceLabel,
    bookingRequestKitchenDetailsSpaces,
} from '../../shared';
import type { BookingRequestKitchenDetailsDraft } from '../../shared';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { IMAGE_CROP_ACCEPT, IMAGE_CROP_PRESETS, imageCompress } from '../utils/imageCropCompress';
import type { Locale } from '../utils/locale';
import { AppImage } from './AppImage';
import { Button } from './base/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './base/card';
import { Textarea } from './base/textarea';
import { SelectableChip } from './SelectableChip';

export type BookingRequestKitchenDetailsPhoto = {
    fileUploadId: string;
    url: string;
};

function ChipRow<T extends string>({
    label,
    values,
    selected,
    disabled,
    renderLabel,
    onChange,
}: {
    label: string;
    values: readonly T[];
    selected: T | null;
    disabled?: boolean;
    renderLabel: (value: T) => string;
    onChange: (next: T | null) => void;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-sm">{label}</p>
            <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                    <SelectableChip
                        key={value}
                        label={renderLabel(value)}
                        selected={selected === value}
                        disabled={disabled}
                        onClick={() => onChange(selected === value ? null : value)}
                    />
                ))}
            </div>
        </div>
    );
}

export function BookingRequestKitchenDetailsFields({
    locale,
    value,
    photos,
    disabled,
    onChange,
    onPhotosChange,
}: {
    locale: Locale;
    value: BookingRequestKitchenDetailsDraft;
    photos: readonly BookingRequestKitchenDetailsPhoto[];
    disabled?: boolean;
    onChange: (next: BookingRequestKitchenDetailsDraft) => void;
    onPhotosChange: (next: BookingRequestKitchenDetailsPhoto[]) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    async function onFilesSelected(fileList: FileList | null) {
        if (fileList == null || fileList.length === 0) return;
        const remaining = BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX - photos.length;
        if (remaining <= 0) return;
        const files = [...fileList].slice(0, remaining);
        setUploadError(null);
        setUploading(true);
        const next = [...photos];
        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    setUploadError(t(locale, 'common', 'contentSections.chooseImage'));
                    continue;
                }
                const compressed = await imageCompress(file, IMAGE_CROP_PRESETS.content);
                const uploaded = await uploadFile(compressed);
                next.push({
                    fileUploadId: uploaded.fileUploadId,
                    url: `/api/file-uploads/${uploaded.fileUploadId}`,
                });
            }
            onPhotosChange(next);
        } catch (error) {
            setUploadError(uploadErrorMessage(error, locale));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    return (
        <div className="grid gap-6">
            <ChipRow
                label={t(locale, 'common', 'bookingRequestKitchenUi.kitchenForChef')}
                values={bookingRequestKitchenDetailsAvailabilities}
                selected={value.availability}
                disabled={disabled || uploading}
                renderLabel={(item) => bookingRequestKitchenDetailsAvailabilityLabel(item, locale)}
                onChange={(availability) => onChange({ ...value, availability })}
            />
            <ChipRow
                label={t(locale, 'common', 'bookingRequestKitchenUi.fridgeSpace')}
                values={bookingRequestKitchenDetailsSpaces}
                selected={value.fridgeSpace}
                disabled={disabled || uploading}
                renderLabel={(item) => bookingRequestKitchenDetailsSpaceLabel(item, locale)}
                onChange={(fridgeSpace) => onChange({ ...value, fridgeSpace })}
            />
            <ChipRow
                label={t(locale, 'common', 'bookingRequestKitchenUi.platingSpace')}
                values={bookingRequestKitchenDetailsSpaces}
                selected={value.platingSpace}
                disabled={disabled || uploading}
                renderLabel={(item) => bookingRequestKitchenDetailsSpaceLabel(item, locale)}
                onChange={(platingSpace) => onChange({ ...value, platingSpace })}
            />
            <ChipRow
                label={t(locale, 'common', 'bookingRequestKitchenUi.guestTableware')}
                values={bookingRequestKitchenDetailsGuestTablewareValues}
                selected={value.guestTableware}
                disabled={disabled || uploading}
                renderLabel={(item) => bookingRequestKitchenDetailsGuestTablewareLabel(item, locale)}
                onChange={(guestTableware) => onChange({ ...value, guestTableware })}
            />
            <div className="grid gap-2">
                <p className="text-sm">{t(locale, 'common', 'bookingRequestKitchenUi.notes')}</p>
                <Textarea
                    value={value.notes}
                    disabled={disabled || uploading}
                    rows={3}
                    onChange={(event) => onChange({ ...value, notes: event.target.value })}
                    placeholder={t(locale, 'common', 'bookingRequestKitchenUi.notesPlaceholder')}
                />
            </div>
            <KitchenDetailsPhotoPicker
                locale={locale}
                photos={photos}
                disabled={disabled || uploading}
                error={uploadError}
                inputRef={inputRef}
                onPick={() => inputRef.current?.click()}
                onFilesSelected={onFilesSelected}
                onRemove={(fileUploadId) => onPhotosChange(photos.filter((photo) => photo.fileUploadId !== fileUploadId))}
            />
        </div>
    );
}

function KitchenDetailsPhotoPicker({
    locale,
    photos,
    disabled,
    error,
    inputRef,
    onPick,
    onFilesSelected,
    onRemove,
}: {
    locale: Locale;
    photos: readonly BookingRequestKitchenDetailsPhoto[];
    disabled?: boolean;
    error: string | null;
    inputRef: RefObject<HTMLInputElement | null>;
    onPick: () => void;
    onFilesSelected: (files: FileList | null) => void;
    onRemove: (fileUploadId: string) => void;
}) {
    const canAdd = photos.length < BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX;
    return (
        <div className="grid gap-2">
            <p className="text-sm">{t(locale, 'common', 'bookingRequestKitchenUi.photos')}</p>
            <p className="text-sm text-muted-foreground">
                {t(locale, 'common', 'bookingRequestKitchenUi.photosHint', { max: BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX })}
            </p>
            <input
                ref={inputRef}
                type="file"
                accept={IMAGE_CROP_ACCEPT}
                multiple
                hidden
                disabled={disabled || !canAdd}
                onChange={(event) => onFilesSelected(event.target.files)}
            />
            {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo) => (
                        <div key={photo.fileUploadId} className="relative overflow-hidden rounded-lg border border-border">
                            <AppImage src={photo.url} alt="" className="aspect-square size-full object-cover" />
                            <Button
                                type="button"
                                size="icon-xs"
                                variant="secondary"
                                className="absolute top-1 right-1"
                                disabled={disabled}
                                aria-label={t(locale, 'common', 'bookingRequestKitchenUi.removePhoto')}
                                onClick={() => onRemove(photo.fileUploadId)}
                            >
                                <XIcon />
                            </Button>
                        </div>
                    ))}
                </div>
            ) : null}
            {canAdd ? (
                <Button type="button" variant="outline" disabled={disabled} onClick={onPick}>
                    {t(locale, 'common', 'bookingRequestKitchenUi.addPhoto')}
                </Button>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    );
}

export function bookingRequestKitchenDetailsDraftFromGql(
    details:
        | {
              availability?: BookingRequestKitchenDetailsDraft['availability'] | null;
              fridgeSpace?: BookingRequestKitchenDetailsDraft['fridgeSpace'] | null;
              platingSpace?: BookingRequestKitchenDetailsDraft['platingSpace'] | null;
              guestTableware?: BookingRequestKitchenDetailsDraft['guestTableware'] | null;
              notes?: string | null;
          }
        | null
        | undefined,
): BookingRequestKitchenDetailsDraft {
    return {
        availability: details?.availability ?? null,
        fridgeSpace: details?.fridgeSpace ?? null,
        platingSpace: details?.platingSpace ?? null,
        guestTableware: details?.guestTableware ?? null,
        notes: details?.notes ?? '',
    };
}

export function bookingRequestKitchenDetailsPhotosFromGql(
    photos: readonly { fileUploadId: string; url: string }[] | null | undefined,
): BookingRequestKitchenDetailsPhoto[] {
    return (photos ?? []).map((photo) => ({ fileUploadId: photo.fileUploadId, url: photo.url }));
}

export function bookingRequestKitchenDetailsInputFromDraft(draft: BookingRequestKitchenDetailsDraft): {
    availability: BookingRequestKitchenDetailsDraft['availability'];
    fridgeSpace: BookingRequestKitchenDetailsDraft['fridgeSpace'];
    platingSpace: BookingRequestKitchenDetailsDraft['platingSpace'];
    guestTableware: BookingRequestKitchenDetailsDraft['guestTableware'];
    notes: string | null;
} | null {
    if (bookingRequestKitchenDetailsDraftIsEmpty(draft)) return null;
    return {
        availability: draft.availability,
        fridgeSpace: draft.fridgeSpace,
        platingSpace: draft.platingSpace,
        guestTableware: draft.guestTableware,
        notes: draft.notes.trim() || null,
    };
}

export function BookingRequestKitchenDetailsSaveCard({
    locale,
    value,
    photos,
    disabled,
    busy,
    error,
    onChange,
    onPhotosChange,
    onSave,
}: {
    locale: Locale;
    value: BookingRequestKitchenDetailsDraft;
    photos: readonly BookingRequestKitchenDetailsPhoto[];
    disabled?: boolean;
    busy?: boolean;
    error?: string | null;
    onChange: (next: BookingRequestKitchenDetailsDraft) => void;
    onPhotosChange: (next: BookingRequestKitchenDetailsPhoto[]) => void;
    onSave: () => void;
}) {
    const empty = bookingRequestKitchenDetailsDraftIsEmpty(value, photos.length);
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t(locale, 'common', 'bookingRequestKitchenUi.aboutKitchen')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t(locale, 'common', 'bookingRequestKitchenUi.aboutHint')}</p>
            </CardHeader>
            <CardContent>
                <BookingRequestKitchenDetailsFields
                    locale={locale}
                    value={value}
                    photos={photos}
                    disabled={disabled || busy}
                    onChange={onChange}
                    onPhotosChange={onPhotosChange}
                />
                {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            </CardContent>
            <CardFooter>
                <Button type="button" disabled={disabled || busy || empty} onClick={onSave}>
                    {t(locale, 'common', 'bookingRequestKitchenUi.save')}
                </Button>
            </CardFooter>
        </Card>
    );
}
