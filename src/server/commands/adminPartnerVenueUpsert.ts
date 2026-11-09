import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { textNormalizeSingleLine, textNormalizeTitled } from '../../shared/textNormalize';
import { partners, partnerVenues } from '../db/schema';
import type { PartnerVenueCreate } from '../db/schema';
import type { BookingRequestExactEventAddress } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationPartnerVenueUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
    GqlSUserBookingRequestExactEventAddressInput,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { contentPathNameNormalize, contentSectionsParseOrThrow, previousPathNamesArchive } from '../utils/contentPageUtils';
import { resolveAssignedPromoCodeId } from '../utils/resolveAssignedPromoCodeId';

function locationAddressNormalize(
    input: GqlSUserBookingRequestExactEventAddressInput | null | undefined,
): BookingRequestExactEventAddress | null {
    if (input == null) return null;
    const exactEventAddress: BookingRequestExactEventAddress = {
        displayText: textNormalizeSingleLine(input.displayText),
        latitude: input.latitude,
        longitude: input.longitude,
        addressLine1: textNormalizeSingleLine(input.addressLine1),
        addressLine2: textNormalizeSingleLine(input.addressLine2),
        city: textNormalizeTitled(input.city),
        postCode: textNormalizeSingleLine(input.postCode),
        state: textNormalizeSingleLine(input.state),
        country: textNormalizeSingleLine(input.country),
    };
    if (exactEventAddress.displayText.length === 0 || exactEventAddress.city.length === 0) {
        throw new Error('adminPartnerVenueUpsert: locationAddress requires displayText and city');
    }
    return exactEventAddress;
}

function firstSectionCtaUrlNormalize(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('adminPartnerVenueUpsert: firstSectionCtaUrl must be http(s) or a site-relative path');
        }
        return trimmed;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('adminPartnerVenueUpsert:')) throw error;
        throw new Error('adminPartnerVenueUpsert: firstSectionCtaUrl must be http(s) or a site-relative path');
    }
}

export async function adminPartnerVenueUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationPartnerVenueUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const pathName = contentPathNameNormalize(input.pathName);
        const sections = contentSectionsParseOrThrow(input.sections);
        const name = input.name.trim();
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        const headlineDe = input.headlineDe.trim();
        const subHeadlineDe = input.subHeadlineDe.trim();
        if (!name || !titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
            throw new Error('adminPartnerVenueUpsert: required fields must not be empty');
        }

        const [owner] = await serverRuntime.db
            .select({ partnerId: partners.partnerId })
            .from(partners)
            .where(eq(partners.partnerId, input.partnerId))
            .limit(1);
        if (!owner) {
            throw new Error('adminPartnerVenueUpsert: partner not found');
        }

        const firstSectionCtaUrl = firstSectionCtaUrlNormalize(input.firstSectionCtaUrl);
        const promoCodeId = await resolveAssignedPromoCodeId(input.promoCodeId, serverRuntime);
        const locationAddress = locationAddressNormalize(input.locationAddress);

        const now = new Date();
        const partnerVenueId = input.partnerVenueId ?? idCreate();

        let previousPathNames: string[] = [];
        if (input.partnerVenueId) {
            const [existing] = await serverRuntime.db
                .select()
                .from(partnerVenues)
                .where(eq(partnerVenues.partnerVenueId, input.partnerVenueId))
                .limit(1);
            if (!existing) {
                throw new Error('adminPartnerVenueUpsert: partner venue not found');
            }
            previousPathNames = previousPathNamesArchive(existing.previousPathNames, existing.pathName, pathName);
        }

        const values: PartnerVenueCreate = {
            partnerVenueId,
            partnerId: input.partnerId,
            pathName,
            previousPathNames,
            name,
            titleDe,
            titleEn: input.titleEn.trim(),
            descriptionDe,
            descriptionEn: input.descriptionEn.trim(),
            headlineDe,
            headlineEn: input.headlineEn.trim(),
            subHeadlineDe,
            subHeadlineEn: input.subHeadlineEn.trim(),
            heroImageFileUploadId: input.heroImageFileUploadId ?? null,
            firstSectionHeadlineDe: input.firstSectionHeadlineDe.trim(),
            firstSectionHeadlineEn: input.firstSectionHeadlineEn.trim(),
            firstSectionBodyDe: input.firstSectionBodyDe.trim(),
            firstSectionBodyEn: input.firstSectionBodyEn.trim(),
            firstSectionImageFileUploadId: input.firstSectionImageFileUploadId ?? null,
            firstSectionCtaUrl,
            heroImageOverlay: input.heroImageOverlay,
            firstSectionImageOverlay: input.firstSectionImageOverlay,
            howItWorksAlternativeMedia: input.howItWorksAlternativeMedia,
            featuredCooksShowCity: input.featuredCooksShowCity,
            locationAddress,
            promoCodeId,
            sections,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        if (input.partnerVenueId) {
            await serverRuntime.db
                .update(partnerVenues)
                .set({
                    partnerId: values.partnerId,
                    pathName: values.pathName,
                    previousPathNames: values.previousPathNames,
                    name: values.name,
                    titleDe: values.titleDe,
                    titleEn: values.titleEn,
                    descriptionDe: values.descriptionDe,
                    descriptionEn: values.descriptionEn,
                    headlineDe: values.headlineDe,
                    headlineEn: values.headlineEn,
                    subHeadlineDe: values.subHeadlineDe,
                    subHeadlineEn: values.subHeadlineEn,
                    heroImageFileUploadId: values.heroImageFileUploadId,
                    firstSectionHeadlineDe: values.firstSectionHeadlineDe,
                    firstSectionHeadlineEn: values.firstSectionHeadlineEn,
                    firstSectionBodyDe: values.firstSectionBodyDe,
                    firstSectionBodyEn: values.firstSectionBodyEn,
                    firstSectionImageFileUploadId: values.firstSectionImageFileUploadId,
                    firstSectionCtaUrl: values.firstSectionCtaUrl,
                    heroImageOverlay: values.heroImageOverlay,
                    firstSectionImageOverlay: values.firstSectionImageOverlay,
                    howItWorksAlternativeMedia: values.howItWorksAlternativeMedia,
                    featuredCooksShowCity: values.featuredCooksShowCity,
                    locationAddress: values.locationAddress,
                    promoCodeId: values.promoCodeId,
                    sections: values.sections,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(partnerVenues.partnerVenueId, partnerVenueId));
        } else {
            await serverRuntime.db.insert(partnerVenues).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerVenueId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
