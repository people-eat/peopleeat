import { useEffect, useState } from 'react';

import { formatMinuteOfDay, parseMinuteOfDay } from '../../../shared/cookCallAvailability';
import { Button } from '../../components/base/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/base/dialog';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import { useLocale } from '../../hooks/useLocale';

const DAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;

type RuleDraft = {
    dayOfWeek: number;
    startMinuteOfDay: number;
    endMinuteOfDay: number;
};

export function ProfileCookCallsRuleDialog({
    open,
    onOpenChange,
    initial,
    onSave,
    saving,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial?: RuleDraft | null;
    onSave: (rule: RuleDraft) => void | Promise<void>;
    saving: boolean;
}) {
    const locale = useLocale();
    const [dayOfWeek, setDayOfWeek] = useState('1');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('12:00');

    useEffect(() => {
        if (!open) return;
        setDayOfWeek(String(initial?.dayOfWeek ?? 1));
        setStartTime(formatMinuteOfDay(initial?.startMinuteOfDay ?? 10 * 60));
        setEndTime(formatMinuteOfDay(initial?.endMinuteOfDay ?? 12 * 60));
    }, [open, initial]);

    const startMinuteOfDay = parseMinuteOfDay(startTime);
    const endMinuteOfDay = parseMinuteOfDay(endTime);
    const isValid =
        startMinuteOfDay != null &&
        endMinuteOfDay != null &&
        startMinuteOfDay < endMinuteOfDay &&
        Number(dayOfWeek) >= 0 &&
        Number(dayOfWeek) <= 6;

    const dayLabels =
        locale === 'de'
            ? ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
            : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{{ de: 'Zeitfenster', en: 'Time window' }[locale]}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <span className="text-sm font-medium">{{ de: 'Wochentag', en: 'Day of week' }[locale]}</span>
                        <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAY_VALUES.map((day) => (
                                    <SelectItem key={day} value={String(day)}>
                                        {dayLabels[day]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <span className="text-sm font-medium">{{ de: 'Von', en: 'From' }[locale]}</span>
                            <Input type="time" step={900} value={startTime} onChange={(event) => setStartTime(event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm font-medium">{{ de: 'Bis', en: 'To' }[locale]}</span>
                            <Input type="time" step={900} value={endTime} onChange={(event) => setEndTime(event.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="button"
                        disabled={!isValid || saving}
                        onClick={() => {
                            if (startMinuteOfDay == null || endMinuteOfDay == null) return;
                            void onSave({
                                dayOfWeek: Number(dayOfWeek),
                                startMinuteOfDay,
                                endMinuteOfDay,
                            });
                        }}
                    >
                        {saving ? { de: 'Speichern…', en: 'Saving…' }[locale] : { de: 'Speichern', en: 'Save' }[locale]}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
