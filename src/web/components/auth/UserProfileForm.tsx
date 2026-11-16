import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import { de as dateFnsDe, enUS as dateFnsEn } from 'date-fns/locale';
import type { SubmitEventHandler } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { phoneNumberNormalize } from '../../../shared/phoneNumber';
import { textNormalizeTitled } from '../../../shared/textNormalize';
import { userBirthDatePickerBounds } from '../../../shared/userBirthDate';
import type { GqlCCookCreate, GqlCUserPreferredCommunication } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useT } from '../../hooks/useT';
import { Button } from '../base/button';
import { Checkbox } from '../base/checkbox';
import { DatePicker } from '../base/date-picker';
import { Input } from '../base/input';
import { CookCreateFields, cookCreateFieldsInitial, cookCreateInputFromFields } from '../CookCreateFields';
import type { CookCreateFieldsState } from '../CookCreateFields';
import { PreferredCommunicationField } from '../PreferredCommunicationField';

const legalLinkClassName =
    'font-semibold text-primary underline underline-offset-4 transition-colors hover:text-primary/80 active:text-primary/60 focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none';

export type UserProfileFormValues = {
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    birthDate?: string;
    preferredCommunication?: GqlCUserPreferredCommunication;
    cook?: GqlCCookCreate;
};

type FieldKey = 'firstName' | 'lastName' | 'phoneNumber' | 'birthDate' | 'preferredCommunication' | 'cook' | 'terms' | 'privacy';

function scrollAndFocus(element: HTMLElement | null) {
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable =
        element instanceof HTMLInputElement || element instanceof HTMLButtonElement || element instanceof HTMLTextAreaElement
            ? element
            : element.querySelector<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
    focusable?.focus({ preventScroll: true });
}

export function UserProfileForm({
    initialValues,
    busy,
    submitLabel,
    includeCook = false,
    inviteCookId = null,
    requireProfileDetails = true,
    formId,
    hideSubmitButton = false,
    onSubmit,
}: {
    initialValues?: Partial<UserProfileFormValues>;
    busy: boolean;
    submitLabel: string;
    /** When true, collect required cook profile fields and attach `cook` on submit. */
    includeCook?: boolean;
    /** Optional inviter cook id from `/chef-sign-up?invite=`. */
    inviteCookId?: string | null;
    /**
     * When true (default), phone, birth date, and preferred communication are
     * required. Gift-card purchase sets this false — GraphQL `UserCreate`
     * accepts omitting them.
     */
    requireProfileDetails?: boolean;
    /** Optional id so an external submit button can use `form={formId}`. */
    formId?: string;
    /** When true, omit the in-form submit button (parent footer submits). */
    hideSubmitButton?: boolean;
    onSubmit: (values: UserProfileFormValues) => void | Promise<void>;
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const birthDateBounds = userBirthDatePickerBounds();
    const [firstName, setFirstName] = useState(initialValues?.firstName ?? '');
    const [lastName, setLastName] = useState(initialValues?.lastName ?? '');
    const [phoneNumber, setPhoneNumber] = useState(initialValues?.phoneNumber ?? '');
    const [birthDate, setBirthDate] = useState<Date | undefined>(
        initialValues?.birthDate ? new Date(`${initialValues.birthDate}T00:00:00`) : undefined,
    );
    const [preferredCommunication, setPreferredCommunication] = useState<GqlCUserPreferredCommunication | ''>(
        initialValues?.preferredCommunication ?? '',
    );
    const [acceptedTermsAndConditions, setAcceptedTermsAndConditions] = useState(false);
    const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
    const [cookFields, setCookFields] = useState<CookCreateFieldsState>(cookCreateFieldsInitial);
    const [showErrors, setShowErrors] = useState(false);

    const firstNameRef = useRef<HTMLInputElement>(null);
    const lastNameRef = useRef<HTMLInputElement>(null);
    const phoneNumberRef = useRef<HTMLInputElement>(null);
    const birthDateRef = useRef<HTMLDivElement>(null);
    const preferredCommunicationRef = useRef<HTMLDivElement>(null);
    const cookFieldsRef = useRef<HTMLDivElement>(null);
    const termsRef = useRef<HTMLLabelElement>(null);
    const privacyRef = useRef<HTMLLabelElement>(null);

    const requiredMessage = t('auth.required');
    const acceptMessage = t('auth.acceptRequired');
    const preferredMessage = t('auth.preferredCommunicationRequired');
    const phoneInvalidMessage = t('auth.phoneCountryCode');
    const normalizedPhoneNumber = phoneNumberNormalize(phoneNumber);

    const errors: Partial<Record<FieldKey, string>> = {};
    if (showErrors) {
        if (firstName.trim().length === 0) errors.firstName = requiredMessage;
        if (lastName.trim().length === 0) errors.lastName = requiredMessage;
        if (requireProfileDetails) {
            if (phoneNumber.trim().length === 0) errors.phoneNumber = requiredMessage;
            else if (!normalizedPhoneNumber) errors.phoneNumber = phoneInvalidMessage;
            if (!birthDate) errors.birthDate = requiredMessage;
            if (!preferredCommunication) errors.preferredCommunication = preferredMessage;
        }
        if (includeCook && 'error' in cookCreateInputFromFields(cookFields, { inviteCookId })) {
            errors.cook = t('auth.cookIncomplete');
        }
        if (!acceptedTermsAndConditions) errors.terms = acceptMessage;
        if (!acceptedPrivacyPolicy) errors.privacy = acceptMessage;
    }

    const onFormSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        if (busy) return;
        setShowErrors(true);

        const nextErrors: FieldKey[] = [];
        if (firstName.trim().length === 0) nextErrors.push('firstName');
        if (lastName.trim().length === 0) nextErrors.push('lastName');
        if (requireProfileDetails) {
            if (phoneNumber.trim().length === 0 || !normalizedPhoneNumber) nextErrors.push('phoneNumber');
            if (!birthDate) nextErrors.push('birthDate');
            if (!preferredCommunication) nextErrors.push('preferredCommunication');
        }

        let cook: GqlCCookCreate | undefined;
        if (includeCook) {
            const built = cookCreateInputFromFields(cookFields, { inviteCookId });
            if ('error' in built) {
                nextErrors.push('cook');
                const cookErrorKey = {
                    travelExpenses: 'auth.travelExpensesInvalid',
                    travelDistance: 'auth.travelDistanceInvalid',
                    incomplete: 'auth.cookIncomplete',
                } as const;
                toast.error(t(cookErrorKey[built.error]));
            } else {
                cook = built.input;
            }
        }

        if (!acceptedTermsAndConditions) nextErrors.push('terms');
        if (!acceptedPrivacyPolicy) nextErrors.push('privacy');

        if (nextErrors.length > 0) {
            const first = nextErrors[0];
            const target =
                first === 'firstName'
                    ? firstNameRef.current
                    : first === 'lastName'
                      ? lastNameRef.current
                      : first === 'phoneNumber'
                        ? phoneNumberRef.current
                        : first === 'birthDate'
                          ? birthDateRef.current
                          : first === 'preferredCommunication'
                            ? preferredCommunicationRef.current
                            : first === 'cook'
                              ? cookFieldsRef.current
                              : first === 'terms'
                                ? termsRef.current
                                : privacyRef.current;
            scrollAndFocus(target);
            return;
        }

        void onSubmit({
            firstName: textNormalizeTitled(firstName),
            lastName: textNormalizeTitled(lastName),
            ...(requireProfileDetails && normalizedPhoneNumber
                ? {
                      phoneNumber: normalizedPhoneNumber,
                      birthDate: format(birthDate!, 'yyyy-MM-dd'),
                      preferredCommunication: preferredCommunication as GqlCUserPreferredCommunication,
                  }
                : {}),
            ...(cook ? { cook } : {}),
        });
    };

    return (
        <form id={formId} className="grid gap-6" onSubmit={onFormSubmit} noValidate>
            <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Input
                            ref={firstNameRef}
                            required
                            autoComplete="given-name"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            placeholder={t('auth.firstName')}
                            disabled={busy}
                            aria-invalid={errors.firstName ? true : undefined}
                        />
                        {errors.firstName ? <p className="text-sm text-destructive">{errors.firstName}</p> : null}
                    </div>
                    <div className="grid gap-1.5">
                        <Input
                            ref={lastNameRef}
                            required
                            autoComplete="family-name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            placeholder={t('auth.lastName')}
                            disabled={busy}
                            aria-invalid={errors.lastName ? true : undefined}
                        />
                        {errors.lastName ? <p className="text-sm text-destructive">{errors.lastName}</p> : null}
                    </div>
                </div>
                {requireProfileDetails ? (
                    <>
                        <div className="grid gap-1.5">
                            <Input
                                ref={phoneNumberRef}
                                required
                                type="tel"
                                autoComplete="tel"
                                value={phoneNumber}
                                onChange={(event) => setPhoneNumber(event.target.value)}
                                placeholder={t('auth.phonePlaceholder')}
                                disabled={busy}
                                aria-invalid={errors.phoneNumber ? true : undefined}
                            />
                            {errors.phoneNumber ? <p className="text-sm text-destructive">{errors.phoneNumber}</p> : null}
                        </div>
                        <div ref={birthDateRef} className="grid gap-1.5">
                            <DatePicker
                                value={birthDate}
                                onValueChange={setBirthDate}
                                placeholder={t('auth.birthDate')}
                                className="w-full"
                                disabled={busy ? true : { after: birthDateBounds.disabledAfter }}
                                locale={locale === 'de' ? dateFnsDe : dateFnsEn}
                                captionLayout="dropdown"
                                defaultMonth={birthDateBounds.defaultMonth}
                                startMonth={birthDateBounds.startMonth}
                                endMonth={birthDateBounds.endMonth}
                                aria-label={t('auth.birthDate')}
                                aria-required
                                aria-invalid={errors.birthDate ? true : undefined}
                            />
                            {errors.birthDate ? <p className="text-sm text-destructive">{errors.birthDate}</p> : null}
                        </div>
                    </>
                ) : null}
            </div>

            {requireProfileDetails ? (
                <div ref={preferredCommunicationRef}>
                    <PreferredCommunicationField
                        value={preferredCommunication}
                        onValueChange={setPreferredCommunication}
                        disabled={busy}
                        required
                        invalid={Boolean(errors.preferredCommunication)}
                        errorMessage={errors.preferredCommunication}
                    />
                </div>
            ) : null}

            {includeCook ? (
                <div ref={cookFieldsRef} className="grid gap-4 border-t border-border pt-6">
                    <p className="font-medium">{t('auth.cookProfile')}</p>
                    <CookCreateFields value={cookFields} onChange={setCookFields} disabled={busy} idPrefix="auth-cook" />
                    {errors.cook ? <p className="text-sm text-destructive">{errors.cook}</p> : null}
                </div>
            ) : null}

            <div className="grid gap-3">
                <label ref={termsRef} className="flex items-start gap-3 text-sm/relaxed">
                    <Checkbox
                        className="mt-0.5"
                        checked={acceptedTermsAndConditions}
                        disabled={busy}
                        onCheckedChange={(checked) => setAcceptedTermsAndConditions(checked === true)}
                        aria-required
                        aria-invalid={errors.terms ? true : undefined}
                    />
                    <span>
                        {t('auth.acceptTermsBefore')}{' '}
                        <Link to="/{-$locale}/terms-and-conditions" target="_blank" className={legalLinkClassName}>
                            {t('auth.acceptTermsLink')}
                        </Link>
                        {t('auth.acceptTermsAfter') ? <> {t('auth.acceptTermsAfter')}</> : null}
                    </span>
                </label>
                {errors.terms ? <p className="text-sm text-destructive">{errors.terms}</p> : null}
                <label ref={privacyRef} className="flex items-start gap-3 text-sm/relaxed">
                    <Checkbox
                        className="mt-0.5"
                        checked={acceptedPrivacyPolicy}
                        disabled={busy}
                        onCheckedChange={(checked) => setAcceptedPrivacyPolicy(checked === true)}
                        aria-required
                        aria-invalid={errors.privacy ? true : undefined}
                    />
                    <span>
                        {t('auth.acceptPrivacyBefore')}{' '}
                        <Link to="/{-$locale}/privacy-policy" target="_blank" className={legalLinkClassName}>
                            {t('auth.acceptPrivacyLink')}
                        </Link>
                        {t('auth.acceptPrivacyAfter') ? <> {t('auth.acceptPrivacyAfter')}</> : null}
                    </span>
                </label>
                {errors.privacy ? <p className="text-sm text-destructive">{errors.privacy}</p> : null}
            </div>

            {hideSubmitButton ? null : (
                <Button type="submit" className="mt-1" disabled={busy}>
                    {submitLabel}
                </Button>
            )}
        </form>
    );
}
