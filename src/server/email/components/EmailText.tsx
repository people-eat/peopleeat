import type { CSSProperties, PropsWithChildren } from 'react';
import { Text } from 'react-email';

import { emailStyles } from './emailStyles';

export function EmailText({ children, style }: PropsWithChildren<{ style?: CSSProperties }>) {
    return <Text style={{ ...emailStyles.text, ...style }}>{children}</Text>;
}
