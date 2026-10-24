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
import type { ReactNode } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './base/dropdown-menu';

const TRACK_SOURCES = [
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
];

const LIVEKIT_ROOM_STYLE = { display: 'contents' } as const;
const VIDEO_CALL_LAYOUT_STYLE = { flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column' } as const;
const GRID_LAYOUT_STYLE = { flex: 1 } as const;

export type BookingRequestOfferCallRoomProps = {
    readonly token: string | undefined;
    readonly serverUrl: string | undefined;
    readonly connect: boolean;
    readonly onDisconnected: () => void;
    readonly children: ReactNode;
};

/** LiveKit room shell — stay mounted on the offer page; toggle `connect` when joining. */
export function BookingRequestOfferCallRoom({ token, serverUrl, connect, onDisconnected, children }: BookingRequestOfferCallRoomProps) {
    return (
        <LiveKitRoom connect={connect} onDisconnected={onDisconnected} serverUrl={serverUrl} style={LIVEKIT_ROOM_STYLE} token={token}>
            {connect ? <RoomAudioRenderer /> : null}
            {children}
        </LiveKitRoom>
    );
}

export function BookingRequestOfferCallVideo() {
    const tracks = useTracks(TRACK_SOURCES);

    return (
        <div data-lk-theme="default" className="flex min-h-112 flex-1 flex-col" style={VIDEO_CALL_LAYOUT_STYLE}>
            <GridLayout style={GRID_LAYOUT_STYLE} tracks={tracks}>
                <ParticipantTile />
            </GridLayout>
        </div>
    );
}

function DeviceToggle({
    source,
    deviceKind,
    label,
    emptyDevicesLabel,
    enabledIcon,
    disabledIcon,
}: {
    readonly source: Track.Source.Microphone | Track.Source.Camera;
    readonly deviceKind: MediaDeviceKind;
    readonly label: string;
    readonly emptyDevicesLabel: string;
    readonly enabledIcon: ReactNode;
    readonly disabledIcon: ReactNode;
}) {
    const { enabled, toggle } = useTrackToggle({ source });
    const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: deviceKind });

    return (
        <div className="flex">
            <Button
                type="button"
                variant={enabled ? 'outline' : 'secondary'}
                className="rounded-r-none border-r-0"
                onClick={() => toggle()}
            >
                {enabled ? enabledIcon : disabledIcon}
                <span className="hidden sm:inline">{label}</span>
            </Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant={enabled ? 'outline' : 'secondary'}
                        size="icon"
                        className="rounded-l-none"
                        aria-label={label}
                    >
                        <ChevronDownIcon className="size-3.5" aria-hidden />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="min-w-[200px]">
                    {devices.length === 0 ? (
                        <DropdownMenuItem disabled>{emptyDevicesLabel}</DropdownMenuItem>
                    ) : (
                        devices.map((device) => (
                            <DropdownMenuItem
                                key={device.deviceId}
                                onSelect={() => setActiveMediaDevice(device.deviceId)}
                                className={cn(device.deviceId === activeDeviceId && 'font-medium')}
                            >
                                {device.deviceId === activeDeviceId ? <span className="text-green-600">•</span> : null}
                                {device.label || device.deviceId}
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
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

/** Mic / camera / leave — for the pinned offer-page footer while a call is active. */
export function BookingRequestOfferCallControls() {
    const locale = useLocale();

    return (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <DeviceToggle
                deviceKind="audioinput"
                disabledIcon={<MicOffIcon className="size-4" aria-hidden />}
                enabledIcon={<MicIcon className="size-4" aria-hidden />}
                emptyDevicesLabel={{ de: 'Kein Mikrofon gefunden', en: 'No microphone found' }[locale]}
                label={{ de: 'Mikrofon', en: 'Microphone' }[locale]}
                source={Track.Source.Microphone}
            />
            <DeviceToggle
                deviceKind="videoinput"
                disabledIcon={<CameraOffIcon className="size-4" aria-hidden />}
                enabledIcon={<CameraIcon className="size-4" aria-hidden />}
                emptyDevicesLabel={{ de: 'Keine Kamera gefunden', en: 'No camera found' }[locale]}
                label={{ de: 'Kamera', en: 'Camera' }[locale]}
                source={Track.Source.Camera}
            />
            <LeaveButton label={{ de: 'Verlassen', en: 'Leave' }[locale]} />
        </div>
    );
}
