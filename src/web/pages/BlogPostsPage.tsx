import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicBlogPostsPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const blogPostsPageTitle = { de: 'Blog', en: 'Blog' } as const;
const blogPostsPageDescription = {
    de: 'Tipps, Geschichten und Neuigkeiten rund um private Dining-Erlebnisse.',
    en: 'Tips, stories, and news about private dining experiences.',
} as const;

export function BlogPostsPage({ data }: { data: GqlCPublicBlogPostsPageQuery }) {
    const locale = useLocale();
    const items = data.publicBlogPost.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{blogPostsPageTitle[locale]}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{blogPostsPageDescription[locale]}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/blog-posts"
                        emptyLabel={{ de: 'Noch keine Beiträge veröffentlicht.', en: 'No posts published yet.' }[locale]}
                        showHeroImage={false}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
