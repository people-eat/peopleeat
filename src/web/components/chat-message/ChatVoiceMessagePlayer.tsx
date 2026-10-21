import { MicIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { GqlCFileUpload, GqlCPublicUser } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { AudioWaveformPlayer } from '../AudioWaveformPlayer';
import { Avatar, AvatarFallback, AvatarImage } from '../base/avatar';

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function ChatVoiceMessagePlayer({
    attachment,
    author,
    tone,
    meta,
}: {
    attachment: GqlCFileUpload;
    author: GqlCPublicUser;
    tone: 'user' | 'assistant';
    /** Timestamp / delivery ticks on the same row as the duration (WhatsApp layout). */
    meta?: ReactNode;
}) {
    const locale = useLocale();

    return (
        <AudioWaveformPlayer
            src={attachment.url}
            waveformSeed={attachment.fileUploadId}
            tone={tone}
            className="max-w-xs"
            meta={meta}
            labels={{
                group: { de: 'Sprachnachricht', en: 'Voice message' }[locale],
                play: { de: 'Sprachnachricht abspielen', en: 'Play voice message' }[locale],
                pause: { de: 'Sprachnachricht pausieren', en: 'Pause voice message' }[locale],
                position: { de: 'Wiedergabeposition', en: 'Playback position' }[locale],
            }}
            leading={
                <div className="relative size-12">
                    <Avatar className="size-12">
                        {author.profilePicture != null ? <AvatarImage src={author.profilePicture.url} alt="" /> : null}
                        <AvatarFallback className="bg-foreground/10 text-xs font-semibold text-foreground/75">
                            {initialsFromName(author.display)}
                        </AvatarFallback>
                    </Avatar>
                    <span
                        aria-hidden
                        className={cn(
                            'absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-2',
                            tone === 'user' ? 'bg-emerald-600 text-white ring-primary' : 'bg-emerald-600 text-white ring-muted',
                        )}
                    >
                        <MicIcon className="size-2.5" strokeWidth={2.5} />
                    </span>
                </div>
            }
        />
    );
}
