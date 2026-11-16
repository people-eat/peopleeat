import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicBlogPostsPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function BlogPostsPage({ data }: { data: GqlCPublicBlogPostsPageQuery }) {
    const locale = useLocale();
    const { t } = useT('public');
    const items = data.publicBlogPost.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{t('blog.title')}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{t('blog.description')}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/blog-posts"
                        emptyLabel={t('blog.empty')}
                        showHeroImage={false}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
