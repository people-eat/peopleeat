import type { PropsWithChildren, ReactNode } from 'react';
import { Body, Container, Head, Html, Preview } from 'react-email';

import type { Locale } from '../../../shared/locale';
import { EmailFooter } from './EmailFooter';
import { EmailGreeting } from './EmailGreeting';
import { EmailHeader } from './EmailHeader';
import { EmailHeading } from './EmailHeading';
import { EmailQuestions } from './EmailQuestions';
import { EmailSignOff } from './EmailSignOff';
import { emailStyles } from './emailStyles';

export type EmailLayoutProps = PropsWithChildren<{
    locale: Locale;
    webPageUrl: string;
    preview: string;
    subject: string;
    recipientFirstName?: string;
    /** Optional hero (e.g. illustration) between logo and subject heading. */
    hero?: ReactNode;
}>;

/**
 * Shared shell for every transactional email:
 * header (logo) → optional hero → subject → Hallo/Hey {name} → body → questions → sign-off → Instagram.
 */
export function EmailLayout({ locale, webPageUrl, preview, subject, recipientFirstName, hero, children }: EmailLayoutProps) {
    return (
        <Html lang={locale}>
            <Head>
                {/* Clients that allow remote fonts get the site faces; others
                    keep the stack fallbacks declared in `emailStyles`. */}
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet" />
            </Head>
            <Preview>{preview}</Preview>
            <Body style={emailStyles.body}>
                <Container style={emailStyles.container}>
                    <EmailHeader webPageUrl={webPageUrl} />
                    {hero}
                    <EmailHeading>{subject}</EmailHeading>
                    <EmailGreeting recipientFirstName={recipientFirstName} locale={locale} />
                    {children}
                    <EmailQuestions locale={locale} />
                    <EmailSignOff locale={locale} />
                    <EmailFooter webPageUrl={webPageUrl} />
                </Container>
            </Body>
        </Html>
    );
}
