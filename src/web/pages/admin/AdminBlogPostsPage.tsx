import { useNavigate } from '@tanstack/react-router';
import { NewspaperIcon, PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

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
import { AdminOverviewListCardLink } from './AdminOverviewListCard';

export const adminBlogPostsPageTitle = { de: 'Blog', en: 'Blog' } as const;
export const adminBlogPostsPageDescription = {
    de: 'Blog-Beiträge verwalten.',
    en: 'Manage blog posts.',
} as const;

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
            toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create.' }[locale]);
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
                            {adminBlogPostsPageTitle[locale]}
                        </h1>
                        <p className="text-muted-foreground">{adminBlogPostsPageDescription[locale]}</p>
                    </div>
                    <Button type="button" disabled={busy} onClick={() => void createPost()}>
                        <PlusIcon className="size-4" />
                        {{ de: 'Neuer Beitrag', en: 'New post' }[locale]}
                    </Button>
                </div>
                <Input
                    type="search"
                    value={draftQ}
                    onChange={(event) => setDraftQ(event.target.value)}
                    placeholder={{ de: 'Titel oder Pfad suchen…', en: 'Search title or path…' }[locale]}
                    aria-label={{ de: 'Blog-Beiträge suchen', en: 'Search blog posts' }[locale]}
                    className="max-w-sm"
                />
                {posts.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Noch keine Beiträge.', en: 'No posts yet.' }[locale]}</p>
                ) : filteredPosts.length === 0 ? (
                    <p className="text-muted-foreground">{{ de: 'Keine Treffer.', en: 'No matches.' }[locale]}</p>
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
                                                    ? { de: 'Veröffentlicht', en: 'Published' }[locale]
                                                    : { de: 'Entwurf', en: 'Draft' }[locale]}
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
