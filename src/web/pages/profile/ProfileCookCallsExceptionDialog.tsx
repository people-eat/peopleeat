import { useEffect, useMemo, useState } from 'react';

import { t } from '../../../i18n/t';
import { parseMinuteOfDay } from '../../../shared/cookCallAvailability';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { DatePicker } from '../../components/base/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { useLocale } from '../../hooks/useLocale';
import { DATE_FNS_LOCALE } from '../../utils/dateFnsLocale';
import { toIsoDateLocal } from './profileCookCallsPageVariables';

type ExceptionDraft = {
    date: string;
    type: 'BLOCK' | 'OPEN';
    startMinuteOfDay: number | null;
    endMinuteOfDay: number | null;
};

function tomorrowAtNoon(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(12, 0, 0, 0);
    return date;
}

export function ProfileCookCallsExceptionDialog({
    open,
    onOpenChange,
    onSave,
    saving,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (exception: ExceptionDraft) => void | Promise<void>;
    saving: boolean;
}) {
    const locale = useLocale();
    const [type, setType] = useState<'BLOCK' | 'OPEN'>('BLOCK');
    const [date, setDate] = useState<Date>(tomorrowAtNoon);
    const [allDay, setAllDay] = useState(true);
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('12:00');

    useEffect(() => {
        if (!open) return;
        setType('BLOCK');
        setDate(tomorrowAtNoon());
        setAllDay(true);
        setStartTime('10:00');
        setEndTime('12:00');
    }, [open]);

    const minDate = useMemo(() => {
        const value = new Date();
        value.setHours(0, 0, 0, 0);
        return value;
    }, []);

    const startMinuteOfDay = parseMinuteOfDay(startTime);
    const endMinuteOfDay = parseMinuteOfDay(endTime);
    const isValid = allDay || (startMinuteOfDay != null && endMinuteOfDay != null && startMinuteOfDay < endMinuteOfDay);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t(locale, 'profileCook', 'calls.exception')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{t(locale, 'profileCook', 'calls.exceptionType')}</span>
                        <Select value={type} onValueChange={(value) => setType(value as 'BLOCK' | 'OPEN')}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="BLOCK">{t(locale, 'profileCook', 'calls.blocked')}</SelectItem>
                                <SelectItem value="OPEN">{t(locale, 'profileCook', 'calls.extraAvailability')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{t(locale, 'profileCook', 'actions.date')}</span>
                        <DatePicker
                            value={date}
                            onValueChange={(next) => next && setDate(next)}
                            placeholder={t(locale, 'profileCook', 'calls.pickDate')}
                            locale={DATE_FNS_LOCALE[locale]}
                            disabled={{ before: minDate }}
                            className="w-full"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={allDay} onCheckedChange={(checked) => setAllDay(checked === true)} />
                        {t(locale, 'profileCook', 'calls.allDayLabel')}
                    </label>
                    {!allDay && (
                        <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <span className="text-sm font-medium">{t(locale, 'profileCook', 'actions.from')}</span>
                                <Input type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <span className="text-sm font-medium">{t(locale, 'profileCook', 'actions.to')}</span>
                                <Input type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        disabled={!isValid || saving}
                        onClick={() => {
                            void onSave({
                                date: toIsoDateLocal(date),
                                type,
                                startMinuteOfDay: allDay ? null : startMinuteOfDay,
                                endMinuteOfDay: allDay ? null : endMinuteOfDay,
                            });
                        }}
                    >
                        {saving ? t(locale, 'profileCook', 'actions.saving') : t(locale, 'common', 'save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
