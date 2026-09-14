import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { blogPosts } from '../db/schema';
import type { BlogPostCreate } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationBlogPostUpsertArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { contentPathNameNormalize, contentSectionsParseOrThrow, previousPathNamesArchive } from '../utils/contentPageUtils';

export async function adminBlogPostUpsert(
    { adminId }: GqlSAdminMutation,
    { input }: GqlSAdminMutationBlogPostUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const pathName = contentPathNameNormalize(input.pathName);
        const sections = contentSectionsParseOrThrow(input.sections);
        const titleDe = input.titleDe.trim();
        const descriptionDe = input.descriptionDe.trim();
        const headlineDe = input.headlineDe.trim();
        const subHeadlineDe = input.subHeadlineDe.trim();
        if (!titleDe || !descriptionDe || !headlineDe || !subHeadlineDe) {
            throw new Error('adminBlogPostUpsert: required German fields must not be empty');
        }

        const now = new Date();
        const blogPostId = input.blogPostId ?? idCreate();

        let previousPathNames: string[] = [];
        if (input.blogPostId) {
            const [existing] = await serverRuntime.db.select().from(blogPosts).where(eq(blogPosts.blogPostId, input.blogPostId)).limit(1);
            if (!existing) {
                throw new Error('adminBlogPostUpsert: blog post not found');
            }
            previousPathNames = previousPathNamesArchive(existing.previousPathNames, existing.pathName, pathName);
        }

        const values: BlogPostCreate = {
            blogPostId,
            pathName,
            previousPathNames,
            titleDe,
            titleEn: input.titleEn.trim(),
            descriptionDe,
            descriptionEn: input.descriptionEn.trim(),
            headlineDe,
            headlineEn: input.headlineEn.trim(),
            subHeadlineDe,
            subHeadlineEn: input.subHeadlineEn.trim(),
            heroImageFileUploadId: input.heroImageFileUploadId ?? null,
            sections,
            publishedAt: input.publishedAt ?? null,
            createdAt: now,
            updatedAt: now,
        };

        if (input.blogPostId) {
            await serverRuntime.db
                .update(blogPosts)
                .set({
                    pathName: values.pathName,
                    previousPathNames: values.previousPathNames,
                    titleDe: values.titleDe,
                    titleEn: values.titleEn,
                    descriptionDe: values.descriptionDe,
                    descriptionEn: values.descriptionEn,
                    headlineDe: values.headlineDe,
                    headlineEn: values.headlineEn,
                    subHeadlineDe: values.subHeadlineDe,
                    subHeadlineEn: values.subHeadlineEn,
                    heroImageFileUploadId: values.heroImageFileUploadId,
                    sections: values.sections,
                    publishedAt: values.publishedAt,
                    updatedAt: now,
                })
                .where(eq(blogPosts.blogPostId, blogPostId));
        } else {
            await serverRuntime.db.insert(blogPosts).values(values);
        }

        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: blogPostId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
