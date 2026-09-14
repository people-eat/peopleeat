import type { PropsWithChildren } from 'react';
import { Button, Section } from 'react-email';

import { emailStyles } from './emailStyles';

export function EmailButton({ href, children }: PropsWithChildren<{ href: string }>) {
    return (
        <Section style={emailStyles.buttonSection}>
            <Button href={href} style={emailStyles.button}>
                {children}
            </Button>
        </Section>
    );
}
