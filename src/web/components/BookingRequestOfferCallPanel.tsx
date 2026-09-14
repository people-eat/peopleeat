import {
    GridLayout,
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useDisconnectButton,
    useMediaDeviceSelect,
    useTracks,
    useTrackToggle,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { CameraIcon, CameraOffIcon, ChevronDownIcon, MicIcon, MicOffIcon, PhoneOffIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';

const TRACK_SOURCES = [
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
];

const LIVEKIT_ROOM_STYLE = { display: 'contents' } as const;
const VIDEO_CALL_LAYOUT_STYLE = { flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' } as const;
const GRID_LAYOUT_STYLE = { flex: 1 } as const;

export type BookingRequestOfferCallPanelProps = {
    readonly token: string;
    readonly serverUrl: string;
    readonly onDisconnected: () => void;
    readonly children?: ReactNode;
};

export function BookingRequestOfferCallPanel({ token, serverUrl, onDisconnected, children }: BookingRequestOfferCallPanelProps) {
    return (
        <LiveKitRoom connect onDisconnected={onDisconnected} serverUrl={serverUrl} style={LIVEKIT_ROOM_STYLE} token={token}>
            {children ?? (
                <div className="flex min-h-112 flex-1 flex-col gap-4">
                    <VideoCallLayout />
                    <VideoCallControls />
                </div>
            )}
        </LiveKitRoom>
    );
}

function VideoCallLayout() {
    const tracks = useTracks(TRACK_SOURCES);

    return (
        <div data-lk-theme="default" style={VIDEO_CALL_LAYOUT_STYLE}>
            <GridLayout style={GRID_LAYOUT_STYLE} tracks={tracks}>
                <ParticipantTile />
            </GridLayout>
            <RoomAudioRenderer />
        </div>
    );
}

function TrackToggleWithDeviceSelect({
    source,
    deviceKind,
    label,
    enabledIcon,
    disabledIcon,
}: {
    readonly source: Track.Source.Microphone | Track.Source.Camera;
    readonly deviceKind: MediaDeviceKind;
    readonly label: string;
    readonly enabledIcon: ReactNode;
    readonly disabledIcon: ReactNode;
}) {
    const { enabled, toggle } = useTrackToggle({ source });
    const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: deviceKind });
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="relative flex">
            <button
                className="flex cursor-pointer items-center gap-2 rounded-l-full bg-foreground px-4 py-2.5 text-background transition-colors hover:bg-foreground/90"
                onClick={() => toggle()}
                type="button"
            >
                {enabled ? enabledIcon : disabledIcon}
                <span className="text-sm">{label}</span>
            </button>
            <button
                className="flex cursor-pointer items-center rounded-r-full border-l border-background/20 bg-foreground p-2.5 text-background transition-colors hover:bg-foreground/90"
                onClick={() => setMenuOpen(!menuOpen)}
                type="button"
                aria-label={label}
            >
                <ChevronDownIcon className="size-3.5" aria-hidden />
            </button>
            {menuOpen && devices.length > 0 ? (
                <div className="absolute bottom-full left-0 z-50 mb-2 min-w-[200px] rounded-lg border border-border bg-background py-1 shadow-lg">
                    {devices.map((device) => (
                        <button
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                            key={device.deviceId}
                            onClick={() => {
                                setActiveMediaDevice(device.deviceId);
                                setMenuOpen(false);
                            }}
                            type="button"
                        >
                            {device.deviceId === activeDeviceId ? <span className="font-bold text-green-600">•</span> : null}
                            <span className={device.deviceId === activeDeviceId ? 'font-medium' : ''}>{device.label}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function LeaveButton({ label }: { readonly label: string }) {
    const { buttonProps } = useDisconnectButton({});

    return (
        <Button type="button" variant="destructive" className="gap-2" onClick={buttonProps.onClick}>
            <PhoneOffIcon className="size-4" aria-hidden />
            <span className="text-sm">{label}</span>
        </Button>
    );
}

function VideoCallControls() {
    const locale = useLocale();

    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <TrackToggleWithDeviceSelect
                deviceKind="audioinput"
                disabledIcon={<MicOffIcon className="size-4" aria-hidden />}
                enabledIcon={<MicIcon className="size-4" aria-hidden />}
                label={{ de: 'Mikrofon', en: 'Microphone' }[locale]}
                source={Track.Source.Microphone}
            />
            <TrackToggleWithDeviceSelect
                deviceKind="videoinput"
                disabledIcon={<CameraOffIcon className="size-4" aria-hidden />}
                enabledIcon={<CameraIcon className="size-4" aria-hidden />}
                label={{ de: 'Kamera', en: 'Camera' }[locale]}
                source={Track.Source.Camera}
            />
            <LeaveButton label={{ de: 'Verlassen', en: 'Leave' }[locale]} />
        </div>
    );
}
