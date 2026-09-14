import type { PropsWithChildren } from 'react';
import { Heading } from 'react-email';

import { emailStyles } from './emailStyles';

export function EmailSectionHeading({ children }: PropsWithChildren) {
    return (
        <Heading as="h2" style={emailStyles.sectionHeading}>
            {children}
        </Heading>
    );
}
