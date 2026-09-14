import type { PropsWithChildren } from 'react';
import { Section, Text } from 'react-email';

import { emailStyles } from './emailStyles';

/** Left-aligned peer-style chat bubble for transactional email message previews. */
export function EmailChatBubble({ children }: PropsWithChildren) {
    return (
        <Section style={emailStyles.chatBubbleSection}>
            <Text style={emailStyles.chatBubble}>{children}</Text>
        </Section>
    );
}
