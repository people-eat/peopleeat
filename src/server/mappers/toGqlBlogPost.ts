import { fileUploadPublicUrl } from '../../shared/contentSection';
import type { BlogPost } from '../db/schema';
import type { GqlSAdminBlogPost, GqlSPublicBlogPost } from '../graphql/generated';
import { toGqlContentSection } from './toGqlContentSection';

function blogPostContentFields(row: BlogPost) {
    return {
        blogPostId: row.blogPostId,
        pathName: row.pathName,
        previousPathNames: row.previousPathNames,
        titleDe: row.titleDe,
        titleEn: row.titleEn,
        descriptionDe: row.descriptionDe,
        descriptionEn: row.descriptionEn,
        headlineDe: row.headlineDe,
        headlineEn: row.headlineEn,
        subHeadlineDe: row.subHeadlineDe,
        subHeadlineEn: row.subHeadlineEn,
        heroImageFileUploadId: row.heroImageFileUploadId,
        heroImageUrl: row.heroImageFileUploadId ? fileUploadPublicUrl(row.heroImageFileUploadId) : null,
        sections: row.sections.map(toGqlContentSection),
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

export function toGqlAdminBlogPost(row: BlogPost): GqlSAdminBlogPost {
    return blogPostContentFields(row);
}

export function toGqlPublicBlogPost(row: BlogPost): GqlSPublicBlogPost {
    return blogPostContentFields(row);
}
