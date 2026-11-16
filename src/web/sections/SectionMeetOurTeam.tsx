import { AppImage } from '../components/AppImage';
import { useT } from '../hooks/useT';

export function SectionMeetOurTeam() {
    const { t } = useT('public');

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="font-serif text-4xl font-light tracking-tight text-foreground @sm:text-6xl">{t('about.teamTitle')}</h2>
                <p className="mt-6 text-lg/8 text-muted-foreground">{t('about.teamIntro')}</p>
            </div>
            <div className="mt-16 flow-root @sm:mt-24">
                <div className="-m-2 rounded-xl bg-foreground/5 p-2 ring-1 ring-foreground/10 ring-inset @lg:-m-4 @lg:rounded-2xl @lg:p-4">
                    <AppImage
                        alt={t('about.teamAlt')}
                        className="rounded-md shadow-2xl ring-1 ring-foreground/10"
                        height={1442}
                        src="/about-us/meet-our-team-section/team.webp"
                        width={2432}
                    />
                </div>
            </div>
            <div className="mx-auto max-w-6xl text-center">
                <p className="mt-20 text-lg/8 text-muted-foreground">
                    {t('about.teamFounders')}
                    <br />
                    <a className="font-semibold text-foreground underline underline-offset-4" href="https://cem-yilmaz.de">
                        Cem Yilmaz
                    </a>{' '}
                    {t('about.teamCto')}{' '}
                    <a className="underline underline-offset-4 hover:text-foreground" href="https://draw-schema.com">
                        {t('about.teamDrawSchema')}
                    </a>
                    .
                    <br />
                    {t('about.teamExperts')}
                </p>
            </div>
        </section>
    );
}
