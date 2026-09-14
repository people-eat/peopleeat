import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCAboutUsPageQuery } from '../graphql/generated';
import { SectionHowWeStarted } from '../sections/SectionHowWeStarted';
import { SectionMeetOurTeam } from '../sections/SectionMeetOurTeam';
import { SectionOurMission } from '../sections/SectionOurMission';
import { SectionWantToJoinOurTeam } from '../sections/SectionWantToJoinOurTeam';

export function AboutUsPage({ data }: { data: GqlCAboutUsPageQuery }) {
    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionHowWeStarted />
                <SectionOurMission />
                <SectionMeetOurTeam />
                <SectionWantToJoinOurTeam />
            </main>
            <Footer />
        </>
    );
}
