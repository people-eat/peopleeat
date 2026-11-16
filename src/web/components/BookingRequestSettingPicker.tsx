import { ClockIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { t } from '../../i18n/t';
import type { BookingRequestSettingChoice } from '../../shared';
import { bookingRequestSettingLabel } from '../../shared';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { AppImage } from './AppImage';
import { Button } from './base/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './base/card';

export type { BookingRequestSettingChoice };

const SETTING_IMAGES = {
    OUTDOOR: {
        src: '/booking-request/setting-outdoor.png',
        altKey: 'bookingRequestSetting.altOutdoor',
    },
    INDOOR: {
        src: '/booking-request/setting-indoor.png',
        altKey: 'bookingRequestSetting.altIndoor',
    },
} as const;

function SettingCard({
    selected,
    disabled,
    onSelect,
    label,
    selectLabel,
    selectedLabel,
    className,
    children,
}: {
    selected: boolean;
    disabled?: boolean;
    onSelect: () => void;
    label: string;
    selectLabel: string;
    selectedLabel: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <Card
            className={cn('h-full justify-between gap-3 bg-white py-4', selected ? 'border-primary shadow-md' : 'border-border', className)}
        >
            <CardHeader className="px-3">
                <CardTitle className="text-base/snug">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3">{children}</CardContent>
            <CardFooter className="mt-auto px-3">
                <Button
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    disabled={disabled}
                    onClick={onSelect}
                >
                    {selected ? selectedLabel : selectLabel}
                </Button>
            </CardFooter>
        </Card>
    );
}

export function BookingRequestSettingPicker({
    locale,
    value,
    disabled,
    onChange,
}: {
    locale: Locale;
    value: BookingRequestSettingChoice;
    disabled?: boolean;
    onChange: (next: BookingRequestSettingChoice) => void;
}) {
    const selectLabel = t(locale, 'common', 'bookingRequestSetting.select');
    const selectedLabel = t(locale, 'common', 'bookingRequestSetting.selected');
    const laterLabel = t(locale, 'common', 'bookingRequestSetting.decideLater');

    return (
        <div className="mt-3 grid gap-3">
            <div className="grid gap-1">
                <p className="text-sm font-medium">{t(locale, 'common', 'bookingRequestSetting.whereDine')}</p>
                <p className="text-sm text-muted-foreground">{t(locale, 'common', 'bookingRequestSetting.whereDineHint')}</p>
            </div>
            <div className="@container w-full min-w-0">
                <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3">
                    <SettingCard
                        selected={value === 'OUTDOOR'}
                        disabled={disabled}
                        onSelect={() => onChange('OUTDOOR')}
                        label={bookingRequestSettingLabel('OUTDOOR', locale)}
                        selectLabel={selectLabel}
                        selectedLabel={selectedLabel}
                    >
                        <div className="aspect-4/3">
                            <AppImage
                                src={SETTING_IMAGES.OUTDOOR.src}
                                alt={t(locale, 'common', SETTING_IMAGES.OUTDOOR.altKey)}
                                className="size-full object-contain"
                            />
                        </div>
                    </SettingCard>
                    <SettingCard
                        className="hidden @2xl:flex"
                        selected={value === 'LATER'}
                        disabled={disabled}
                        onSelect={() => onChange('LATER')}
                        label={laterLabel}
                        selectLabel={selectLabel}
                        selectedLabel={selectedLabel}
                    >
                        <div className="flex aspect-4/3 items-center justify-center">
                            <ClockIcon className="size-10 text-muted-foreground" />
                        </div>
                    </SettingCard>
                    <SettingCard
                        selected={value === 'INDOOR'}
                        disabled={disabled}
                        onSelect={() => onChange('INDOOR')}
                        label={bookingRequestSettingLabel('INDOOR', locale)}
                        selectLabel={selectLabel}
                        selectedLabel={selectedLabel}
                    >
                        <div className="aspect-4/3">
                            <AppImage
                                src={SETTING_IMAGES.INDOOR.src}
                                alt={t(locale, 'common', SETTING_IMAGES.INDOOR.altKey)}
                                className="size-full object-contain"
                            />
                        </div>
                    </SettingCard>
                    <Button
                        type="button"
                        variant={value === 'LATER' ? 'default' : 'outline'}
                        size="sm"
                        className="col-span-2 w-full @2xl:hidden"
                        disabled={disabled}
                        onClick={() => onChange('LATER')}
                    >
                        <ClockIcon />
                        {value === 'LATER' ? selectedLabel : laterLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
