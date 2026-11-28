import { eq } from 'drizzle-orm';

import { cityCountryCodeAssert } from '../../shared/cityCountryCode';
import { idCreate } from '../../shared/idCreate';
import { cities } from '../db/schema';
import type { CityCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCityUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { contentPathNameNormalize, contentSectionsParseOrThrow, previousPathNamesArchive } from '../utils/contentPageUtils';

export async function adminCityUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationCityUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, requestingSession, serverRuntime);

    try {
        const pathName = contentPathNameNormalize(input.pathName);
        const sections = contentSectionsParseOrThrow(input.sections);
        const countryCode = cityCountryCodeAssert(input.countryCode, 'adminCityUpsert');
        const nameDe = input.nameDe.trim();
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        const headlineDe = input.headlineDe.trim();
        const subHeadlineDe = input.subHeadlineDe.trim();
        if (!nameDe || !titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
            throw new Error('adminCityUpsert: required German fields must not be empty');
        }

        const now = new Date();
        const cityId = input.cityId ?? idCreate();

        // Phase 1 — build payload
        let previousPathNames: string[] = [];
        if (input.cityId) {
            const [existing] = await serverRuntime.db.select().from(cities).where(eq(cities.cityId, input.cityId)).limit(1);
            if (!existing) {
                throw new Error('adminCityUpsert: city not found');
            }
            previousPathNames = previousPathNamesArchive(existing.previousPathNames, existing.pathName, pathName);
        }

        const values: CityCreate = {
            cityId,
            pathName,
            previousPathNames,
            nameDe,
            nameEn: input.nameEn.trim(),
            nameNl: input.nameNl.trim(),
            countryCode,
            latitude: input.latitude,
            longitude: input.longitude,
            titleDe,
            titleEn: input.titleEn.trim(),
            titleNl: input.titleNl.trim(),
            descriptionDe,
            descriptionEn: input.descriptionEn.trim(),
            descriptionNl: input.descriptionNl.trim(),
            headlineDe,
            headlineEn: input.headlineEn.trim(),
            headlineNl: input.headlineNl.trim(),
            subHeadlineDe,
            subHeadlineEn: input.subHeadlineEn.trim(),
            subHeadlineNl: input.subHeadlineNl.trim(),
            heroImageFileUploadId: input.heroImageFileUploadId ?? null,
            firstSectionHeadlineDe: input.firstSectionHeadlineDe.trim(),
            firstSectionHeadlineEn: input.firstSectionHeadlineEn.trim(),
            firstSectionHeadlineNl: input.firstSectionHeadlineNl.trim(),
            firstSectionBodyDe: input.firstSectionBodyDe.trim(),
            firstSectionBodyEn: input.firstSectionBodyEn.trim(),
            firstSectionBodyNl: input.firstSectionBodyNl.trim(),
            firstSectionImageFileUploadId: input.firstSectionImageFileUploadId ?? null,
            sections,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        // Phase 2 — write
        if (input.cityId) {
            await serverRuntime.db
                .update(cities)
                .set({
                    pathName: values.pathName,
                    previousPathNames: values.previousPathNames,
                    nameDe: values.nameDe,
                    nameEn: values.nameEn,
                    nameNl: values.nameNl,
                    countryCode: values.countryCode,
                    latitude: values.latitude,
                    longitude: values.longitude,
                    titleDe: values.titleDe,
                    titleEn: values.titleEn,
                    titleNl: values.titleNl,
                    descriptionDe: values.descriptionDe,
                    descriptionEn: values.descriptionEn,
                    descriptionNl: values.descriptionNl,
                    headlineDe: values.headlineDe,
                    headlineEn: values.headlineEn,
                    headlineNl: values.headlineNl,
                    subHeadlineDe: values.subHeadlineDe,
                    subHeadlineEn: values.subHeadlineEn,
                    subHeadlineNl: values.subHeadlineNl,
                    heroImageFileUploadId: values.heroImageFileUploadId,
                    firstSectionHeadlineDe: values.firstSectionHeadlineDe,
                    firstSectionHeadlineEn: values.firstSectionHeadlineEn,
                    firstSectionHeadlineNl: values.firstSectionHeadlineNl,
                    firstSectionBodyDe: values.firstSectionBodyDe,
                    firstSectionBodyEn: values.firstSectionBodyEn,
                    firstSectionBodyNl: values.firstSectionBodyNl,
                    firstSectionImageFileUploadId: values.firstSectionImageFileUploadId,
                    sections: values.sections,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(cities.cityId, cityId));
        } else {
            await serverRuntime.db.insert(cities).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: cityId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
