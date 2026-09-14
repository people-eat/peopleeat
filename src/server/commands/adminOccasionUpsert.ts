import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { occasions } from '../db/schema';
import type { OccasionCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationOccasionUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import {
    contentPathNameNormalize,
    contentSectionsParseOrThrow,
    occasionFormatsSectionParseOrThrow,
    previousPathNamesArchive,
} from '../utils/contentPageUtils';
import { resolveAssignedPromoCodeId } from '../utils/resolveAssignedPromoCodeId';

export async function adminOccasionUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationOccasionUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const pathName = contentPathNameNormalize(input.pathName);
        const sections = contentSectionsParseOrThrow(input.sections);
        const formatsSection = occasionFormatsSectionParseOrThrow(input.formatsSection);
        const name = input.name.trim();
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        const headlineDe = input.headlineDe.trim();
        const subHeadlineDe = input.subHeadlineDe.trim();
        if (!name || !titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
            throw new Error('adminOccasionUpsert: required fields must not be empty');
        }

        const promoCodeId = await resolveAssignedPromoCodeId(input.promoCodeId, serverRuntime);

        const now = new Date();
        const occasionId = input.occasionId ?? idCreate();

        let previousPathNames: string[] = [];
        if (input.occasionId) {
            const [existing] = await serverRuntime.db.select().from(occasions).where(eq(occasions.occasionId, input.occasionId)).limit(1);
            if (!existing) {
                throw new Error('adminOccasionUpsert: occasion not found');
            }
            previousPathNames = previousPathNamesArchive(existing.previousPathNames, existing.pathName, pathName);
        }

        const values: OccasionCreate = {
            occasionId,
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
            formatsSection,
            promoCodeId,
            sections,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        if (input.occasionId) {
            await serverRuntime.db
                .update(occasions)
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
                    formatsSection: values.formatsSection,
                    promoCodeId: values.promoCodeId,
                    sections: values.sections,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(occasions.occasionId, occasionId));
        } else {
            await serverRuntime.db.insert(occasions).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: occasionId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
