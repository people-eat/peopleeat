import { Link, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import { useState } from 'react';
import type { SubmitEventHandler } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { userBirthDatePickerBounds } from '../../../shared/userBirthDate';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { Button } from '../../components/base/button';
import { Checkbox } from '../../components/base/checkbox';
import { DatePicker } from '../../components/base/date-picker';
import { Input } from '../../components/base/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/base/select';
import {
    CookCreateFields,
    cookCreateFieldsInitial,
    cookCreateFieldsReady,
    cookCreateInputFromFields,
} from '../../components/CookCreateFields';
import type { CookCreateFieldsState } from '../../components/CookCreateFields';
import { AdminUserCreateDocument } from '../../graphql/generated';
import type { GqlCUserPreferredCommunication } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

export const adminUserCreatePageTitle = { de: 'Benutzer anlegen', en: 'Create user' } as const;
export const adminUserCreatePageDescription = {
    de: 'Konto manuell anlegen. Rechtstexte werden bei der ersten Anmeldung bestätigt.',
    en: 'Create an account manually. Legal texts are accepted on first log-on.',
} as const;

const CREATE_FORM_ID = 'admin-user-create-form';

const preferredCommunicationOptions: { value: GqlCUserPreferredCommunication; de: string; en: string }[] = [
    { value: 'SMS', de: 'Nachricht', en: 'Message' },
    { value: 'WHATS_APP', de: 'WhatsApp', en: 'WhatsApp' },
    { value: 'CALL', de: 'Anruf', en: 'Call' },
    { value: 'E_MAIL', de: 'E-Mail', en: 'Email' },
];

export function AdminUserCreatePage() {
    const locale = useLocale();
    const navigate = useNavigate();
    const [, userCreate] = useMutation(AdminUserCreateDocument);
    const birthDateBounds = userBirthDatePickerBounds();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [birthDate, setBirthDate] = useState<Date | undefined>();
    const [preferredCommunication, setPreferredCommunication] = useState<GqlCUserPreferredCommunication | ''>('');
    const [asAdmin, setAsAdmin] = useState(false);
    const [asCook, setAsCook] = useState(false);
    const [cookFields, setCookFields] = useState<CookCreateFieldsState>(cookCreateFieldsInitial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(false);

    const onSubmit: SubmitEventHandler<HTMLFormElement> = async (event) => {
        event.preventDefault();
        if (busy || !birthDate || !preferredCommunication) return;

        let cookInput = undefined;
        if (asCook) {
            const built = cookCreateInputFromFields(cookFields);
            if ('error' in built) {
                toast.error(
                    {
                        travelExpenses: {
                            de: 'Bitte gib gültige Reisekosten ein (mind. 0,25 €).',
                            en: 'Please enter valid travel expenses (at least €0.25).',
                        },
                        travelDistance: {
                            de: 'Die maximale Reisestrecke muss zwischen 5 und 250 km liegen.',
                            en: 'Maximum travel distance must be between 5 and 250 km.',
                        },
                        incomplete: {
                            de: 'Bitte vervollständige das Koch-Profil.',
                            en: 'Please complete the chef profile.',
                        },
                    }[built.error][locale],
                );
                return;
            }
            cookInput = built.input;
        }

        setBusy(true);
        setError(false);
        try {
            const result = await userCreate({
                input: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    emailAddress: emailAddress.trim(),
                    phoneNumber: phoneNumber.trim(),
                    birthDate: format(birthDate, 'yyyy-MM-dd'),
                    preferredCommunication,
                    asAdmin,
                    ...(cookInput ? { cook: cookInput } : {}),
                },
            });
            const referenceId = result.data?.admin.userCreate.referenceId;
            if (result.error || !result.data?.admin.userCreate.success || !referenceId) {
                setError(true);
                return;
            }
            await navigate({
                to: '/{-$locale}/admin/users/$userId',
                params: { userId: referenceId },
            });
        } catch {
            setError(true);
        } finally {
            setBusy(false);
        }
    };

    const submitDisabled =
        busy ||
        firstName.trim().length === 0 ||
        lastName.trim().length === 0 ||
        emailAddress.trim().length === 0 ||
        phoneNumber.trim().length === 0 ||
        !birthDate ||
        !preferredCommunication ||
        (asCook && !cookCreateFieldsReady(cookFields));

    return (
        <AdminPathPageChrome contentClassName="min-h-0 overflow-hidden gap-0">
            <AdminPinnedFooterLayout
                contentClassName="grid w-full content-start gap-8"
                footer={
                    <>
                        <Button type="button" variant="outline" disabled={busy} asChild>
                            <Link to="/{-$locale}/admin/users">{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</Link>
                        </Button>
                        <Button type="submit" form={CREATE_FORM_ID} disabled={submitDisabled}>
                            {busy ? { de: 'Anlegen…', en: 'Creating…' }[locale] : { de: 'Benutzer anlegen', en: 'Create user' }[locale]}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-2">
                    <h1 className="font-serif text-4xl/tight text-foreground">{adminUserCreatePageTitle[locale]}</h1>
                    <p className="text-muted-foreground">{adminUserCreatePageDescription[locale]}</p>
                </div>

                <form id={CREATE_FORM_ID} className="grid gap-5" onSubmit={onSubmit}>
                    <div className="grid gap-2">
                        <label htmlFor="admin-user-first-name" className="text-sm font-medium">
                            {{ de: 'Vorname', en: 'First name' }[locale]}
                        </label>
                        <Input
                            id="admin-user-first-name"
                            name="firstName"
                            autoComplete="given-name"
                            required
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="admin-user-last-name" className="text-sm font-medium">
                            {{ de: 'Nachname', en: 'Last name' }[locale]}
                        </label>
                        <Input
                            id="admin-user-last-name"
                            name="lastName"
                            autoComplete="family-name"
                            required
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="admin-user-email" className="text-sm font-medium">
                            {{ de: 'E-Mail', en: 'Email' }[locale]}
                        </label>
                        <Input
                            id="admin-user-email"
                            name="emailAddress"
                            type="email"
                            autoComplete="email"
                            required
                            value={emailAddress}
                            onChange={(event) => setEmailAddress(event.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="admin-user-phone" className="text-sm font-medium">
                            {{ de: 'Telefonnummer', en: 'Phone number' }[locale]}
                        </label>
                        <Input
                            id="admin-user-phone"
                            name="phoneNumber"
                            type="tel"
                            autoComplete="tel"
                            required
                            value={phoneNumber}
                            onChange={(event) => setPhoneNumber(event.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <span id="admin-user-birth-date-label" className="text-sm font-medium">
                            {{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}
                        </span>
                        <DatePicker
                            value={birthDate}
                            onValueChange={setBirthDate}
                            placeholder={{ de: 'Geburtsdatum', en: 'Date of birth' }[locale]}
                            className="w-full"
                            disabled={{ after: birthDateBounds.disabledAfter }}
                            locale={locale === 'de' ? dateFnsDe : dateFnsEn}
                            captionLayout="dropdown"
                            defaultMonth={birthDateBounds.defaultMonth}
                            startMonth={birthDateBounds.startMonth}
                            endMonth={birthDateBounds.endMonth}
                            aria-labelledby="admin-user-birth-date-label"
                            aria-required
                        />
                    </div>

                    <div className="grid gap-2">
                        <span className="text-sm font-medium">
                            {{ de: 'Bevorzugte Kommunikation', en: 'Preferred communication' }[locale]}
                        </span>
                        <Select
                            value={preferredCommunication || undefined}
                            onValueChange={(value) => setPreferredCommunication(value as GqlCUserPreferredCommunication)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={{ de: 'Auswählen…', en: 'Select…' }[locale]} />
                            </SelectTrigger>
                            <SelectContent>
                                {preferredCommunicationOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option[locale]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <fieldset className="grid gap-3">
                        <legend className="text-sm font-medium">{{ de: 'Mitgliedschaft', en: 'Membership' }[locale]}</legend>
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Ohne Koch-Profil zählt das Konto als Kunde. Admin und Koch können kombiniert werden.',
                                    en: 'Without a cook profile the account counts as a customer. Admin and cook can be combined.',
                                }[locale]
                            }
                        </p>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={asAdmin} onCheckedChange={(checked) => setAsAdmin(checked === true)} />
                            {{ de: 'Admin', en: 'Admin' }[locale]}
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={asCook} onCheckedChange={(checked) => setAsCook(checked === true)} />
                            {{ de: 'Koch', en: 'Cook' }[locale]}
                        </label>
                    </fieldset>

                    {asCook ? (
                        <div className="grid gap-3 border-t border-border pt-5">
                            <p className="text-sm font-medium">{{ de: 'Koch-Profil', en: 'Chef profile' }[locale]}</p>
                            <CookCreateFields value={cookFields} onChange={setCookFields} disabled={busy} idPrefix="admin-user-cook" />
                        </div>
                    ) : null}

                    {error ? (
                        <p className="text-sm text-destructive" role="alert">
                            {
                                {
                                    de: 'Anlegen fehlgeschlagen. Prüfe die Angaben (E-Mail oder Telefon ggf. bereits vergeben).',
                                    en: 'Could not create. Check the fields (email or phone may already be registered).',
                                }[locale]
                            }
                        </p>
                    ) : null}
                </form>
            </AdminPinnedFooterLayout>
        </AdminPathPageChrome>
    );
}
