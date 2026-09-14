import { formatChatDateMarker } from '../../chat/formatChatDateMarker';
import type { Locale } from '../../utils/locale';

/** Centered muted pill for a chat day group (`YYYY-MM-DD`). */
export function ChatDateMarker({ date, locale }: { date: string; locale: Locale }) {
    return (
        <div className="flex justify-center">
            <time dateTime={date} className="rounded-full bg-foreground/3 px-3 py-1 text-xs text-muted-foreground">
                {formatChatDateMarker(date, locale)}
            </time>
        </div>
    );
}
