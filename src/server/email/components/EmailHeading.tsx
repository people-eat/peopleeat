import type { PropsWithChildren } from 'react';
import { Heading } from 'react-email';

import { emailStyles } from './emailStyles';

export function EmailHeading({ children }: PropsWithChildren) {
    return (
        <Heading as="h1" style={emailStyles.heading}>
            {children}
        </Heading>
    );
}
