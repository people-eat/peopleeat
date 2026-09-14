import { notFound } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { AdminPageChrome } from '../../components/AdminPageChrome';
import { ContentPageEditor, contentPageEditorTabFromSearch } from '../../components/ContentPageEditor';
import type { ContentPageEditorSearch, ContentPageEditorValues } from '../../components/ContentPageEditor';
import { contentSectionsFromGql, contentSectionsToInput } from '../../components/contentSectionsMap';
import type { GqlCAdminBlogPostPageQuery } from '../../graphql/generated';
import { AdminBlogPostDeleteDocument, AdminBlogPostPageUpdatesDocument, AdminBlogPostUpsertDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';

export { parseContentPageEditorSearch as parseAdminBlogPostPageSearch } from '../../components/ContentPageEditor';

export const adminBlogPostPageTitle = { de: 'Beitrag bearbeiten', en: 'Edit post' } as const;
export const adminBlogPostPageDescription = {
    de: 'Blog-Beitrag bearbeiten.',
    en: 'Edit blog post.',
} as const;

type BlogRow = NonNullable<NonNullable<GqlCAdminBlogPostPageQuery['currentSession']['user']>['admin']>['blogPost'];

function valuesFromPost(post: NonNullable<BlogRow>): ContentPageEditorValues {
    return {
        pathName: post.pathName,
        titleDe: post.titleDe,
        titleEn: post.titleEn,
        descriptionDe: post.descriptionDe,
        descriptionEn: post.descriptionEn,
        headlineDe: post.headlineDe,
        headlineEn: post.headlineEn,
        subHeadlineDe: post.subHeadlineDe,
        subHeadlineEn: post.subHeadlineEn,
        heroImageFileUploadId: post.heroImageFileUploadId ?? null,
        sections: contentSectionsFromGql(post.sections),
        publishedAt: post.publishedAt,
    };
}

export function AdminBlogPostPage({
    data,
    blogPostId,
    search,
}: {
    data: GqlCAdminBlogPostPageQuery;
    blogPostId: string;
    search: ContentPageEditorSearch;
}) {
    const locale = useLocale();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const seedPost = seedAdmin?.blogPost ?? null;
    if (!seedPost) throw notFound();

    const [values, setValues] = useState<ContentPageEditorValues>(() => valuesFromPost(seedPost));
    const [busy, setBusy] = useState(false);
    const pageDirtyRef = useRef(false);
    const [, upsert] = useMutation(AdminBlogPostUpsertDocument);
    const [, remove] = useMutation(AdminBlogPostDeleteDocument);
    const tab = contentPageEditorTabFromSearch(search);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminBlogPostPageUpdatesDocument, { blogPostId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.blogPost;
                if (next && !pageDirtyRef.current) setValues(valuesFromPost(next));
            }),
        );
        return unsubscribe;
    }, [client, blogPostId, seedAdmin]);

    const postTitle = { de: values.titleDe, en: values.titleEn }[locale].trim();

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Blog Beiträge', en: 'Blog Posts' }[locale], to: '/{-$locale}/admin/blog-posts' },
                { label: postTitle || { de: 'Beitrag', en: 'Post' }[locale] },
            ]}
        >
            <ContentPageEditor
                uiLocale={locale}
                values={values}
                onChange={(partial) => {
                    pageDirtyRef.current = true;
                    setValues((prev) => ({ ...prev, ...partial }));
                }}
                busy={busy}
                heroVariant="article"
                listTo="/{-$locale}/admin/blog-posts"
                detail={{ to: '/{-$locale}/admin/blog-posts/$blogPostId', params: { blogPostId } }}
                tab={tab}
                user={data.currentSession.user}
                onSave={async (next) => {
                    setBusy(true);
                    try {
                        const result = await upsert({
                            input: {
                                blogPostId,
                                pathName: next.pathName,
                                titleDe: next.titleDe,
                                titleEn: next.titleEn,
                                descriptionDe: next.descriptionDe,
                                descriptionEn: next.descriptionEn,
                                headlineDe: next.headlineDe,
                                headlineEn: next.headlineEn,
                                subHeadlineDe: next.subHeadlineDe,
                                subHeadlineEn: next.subHeadlineEn,
                                heroImageFileUploadId: next.heroImageFileUploadId,
                                sections: contentSectionsToInput(next.sections),
                                publishedAt: next.publishedAt,
                            },
                        });
                        if (result.error || !result.data?.admin.blogPostUpsert.success) {
                            throw new Error('upsert failed');
                        }
                        pageDirtyRef.current = false;
                    } finally {
                        setBusy(false);
                    }
                }}
                onDelete={async () => {
                    setBusy(true);
                    try {
                        const result = await remove({ blogPostId });
                        if (result.error || !result.data?.admin.blogPostDelete.success) {
                            throw new Error('delete failed');
                        }
                    } finally {
                        setBusy(false);
                    }
                }}
            />
        </AdminPageChrome>
    );
}
