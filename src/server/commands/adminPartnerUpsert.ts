import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { partners } from '../db/schema';
import type { PartnerCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationPartnerUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { contentPathNameNormalize, contentSectionsParseOrThrow, previousPathNamesArchive } from '../utils/contentPageUtils';
import { resolveAssignedPromoCodeId } from '../utils/resolveAssignedPromoCodeId';

function firstSectionCtaUrlNormalize(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    // Site-relative path (not protocol-relative `//…`).
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('adminPartnerUpsert: firstSectionCtaUrl must be http(s) or a site-relative path');
        }
        return trimmed;
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('adminPartnerUpsert:')) throw error;
        throw new Error('adminPartnerUpsert: firstSectionCtaUrl must be http(s) or a site-relative path');
    }
}

export async function adminPartnerUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationPartnerUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const pathName = contentPathNameNormalize(input.pathName);
        const sections = contentSectionsParseOrThrow(input.sections);
        const name = input.name.trim();
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        const headlineDe = input.headlineDe.trim();
        const subHeadlineDe = input.subHeadlineDe.trim();
        if (!name || !titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
            throw new Error('adminPartnerUpsert: required fields must not be empty');
        }

        const firstSectionCtaUrl = firstSectionCtaUrlNormalize(input.firstSectionCtaUrl);
        const promoCodeId = await resolveAssignedPromoCodeId(input.promoCodeId, serverRuntime);

        const now = new Date();
        const partnerId = input.partnerId ?? idCreate();

        let previousPathNames: string[] = [];
        if (input.partnerId) {
            const [existing] = await serverRuntime.db.select().from(partners).where(eq(partners.partnerId, input.partnerId)).limit(1);
            if (!existing) {
                throw new Error('adminPartnerUpsert: partner not found');
            }
            previousPathNames = previousPathNamesArchive(existing.previousPathNames, existing.pathName, pathName);
        }

        const values: PartnerCreate = {
            partnerId,
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
            promoCodeId,
            sections,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        if (input.partnerId) {
            await serverRuntime.db
                .update(partners)
                .set({
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
                    promoCodeId: values.promoCodeId,
                    sections: values.sections,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(partners.partnerId, partnerId));
        } else {
            await serverRuntime.db.insert(partners).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: partnerId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
