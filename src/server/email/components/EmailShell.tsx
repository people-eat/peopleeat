import type { PropsWithChildren } from 'react';
import { Container, Section } from 'react-email';

import { emailClassNames, emailNarrowLayoutCss, emailStyles } from './emailStyles';

/** Head `<style>` that drops the card border and canvas gutter below 600px. */
export function EmailNarrowLayoutStyle() {
    return <style>{emailNarrowLayoutCss}</style>;
}

/** Full-width canvas around the white card. Shared by every template shell. */
export function EmailShell({ children }: PropsWithChildren) {
    return (
        <Section tdClassName={emailClassNames.canvas} style={emailStyles.canvas}>
            <Container className={emailClassNames.card} style={emailStyles.container}>
                {children}
            </Container>
        </Section>
    );
}
