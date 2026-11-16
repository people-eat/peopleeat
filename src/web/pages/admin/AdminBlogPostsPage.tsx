import { useNavigate } from '@tanstack/react-router';
import { NewspaperIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import type { GqlCAdminBlogPostsPageQuery } from '../../graphql/generated';
import { AdminBlogPostsPageUpdatesDocument, AdminBlogPostUpsertDocument } from '../../graphql/generated';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export function adminBlogPostsPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.blogPosts.title');
}
export function adminBlogPostsPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'nav.blogPosts.description');
}

export function AdminBlogPostsPage({ data }: { data: GqlCAdminBlogPostsPageQuery }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState(seed);
    const [, upsert] = useMutation(AdminBlogPostUpsertDocument);
    const [busy, setBusy] = useState(false);
    const [draftQ, setDraftQ] = useState('');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminBlogPostsPageUpdatesDocument, {});
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                if (result.data?.adminUpdates) setAdmin(result.data.adminUpdates);
            }),
        );
        return unsubscribe;
    }, [client, seed]);

    const posts = admin?.blogPosts ?? [];
    const q = debouncedQ.trim().toLowerCase();
    const filteredPosts = q
        ? posts.filter((post) => post.titleDe.toLowerCase().includes(q) || post.pathName.toLowerCase().includes(q))
        : posts;

    async function createPost() {
        setBusy(true);
        try {
            const result = await upsert({
                input: {
                    pathName: `beitrag-${Date.now()}`,
                    titleDe: 'Neuer Beitrag',
                    titleEn: '',
                    descriptionDe: 'Beschreibung',
                    descriptionEn: '',
                    headlineDe: 'Überschrift',
                    headlineEn: '',
                    subHeadlineDe: 'Unterüberschrift',
                    subHeadlineEn: '',
                    sections: [],
                    publishedAt: null,
                },
            });
            const id = result.data?.admin.blogPostUpsert.referenceId;
            if (!id || result.error) throw new Error('create failed');
            await navigate({ to: '/{-$locale}/admin/blog-posts/$blogPostId', params: { blogPostId: id } });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotCreate'));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-2">
                        <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                            <NewspaperIcon className="size-8 text-muted-foreground" aria-hidden />
                            {adminBlogPostsPageTitle(locale)}
                        </h1>
                        <p className="text-muted-foreground">{adminBlogPostsPageDescription(locale)}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createPost()}>
                        <PlusIcon className="size-4" />
                        {t(locale, 'admin', 'copy.newPost')}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={t(locale, 'admin', 'copy.searchTitleOrPath')}
                    aria-label={t(locale, 'admin', 'copy.searchBlogPosts')}
                    className="max-w-sm"
                />
                {posts.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noPostsYet')}</p>
                ) : filteredPosts.length === 0 ? (
                    <p className="text-muted-foreground">{t(locale, 'admin', 'copy.noMatches')}</p>
                ) : (
                    <ul className="grid gap-2">
                        {filteredPosts.map((post) => (
                            <li key={post.blogPostId}>
                                <AdminOverviewListCardLink
                                    to="/{-$locale}/admin/blog-posts/$blogPostId"
                                    params={{ blogPostId: post.blogPostId }}
                                    title={
                                        <>
                                            {post.titleDe}
                                            <Badge variant="outline">
                                                {post.publishedAt
                                                    ? t(locale, 'admin', 'copy.published2')
                                                    : t(locale, 'admin', 'copy.draft')}
                                            </Badge>
                                        </>
                                    }
                                    description={`/${post.pathName}`}
                                    meta={formatDate(new Date(post.updatedAt), { locale, timeZone })}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </main>
        </AdminPathPageChrome>
    );
}
