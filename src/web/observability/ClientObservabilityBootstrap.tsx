import { useEffect } from 'react';

import { staleClientChunkReloadListen } from '../utils/staleClientChunkReload';
import { clientObservabilityWebVitalsStart } from './clientObservability';

/** Mounts browser RUM collectors (Web Vitals). See docs/architecture/observability.md. */
export function ClientObservabilityBootstrap() {
    useEffect(() => {
        staleClientChunkReloadListen();
        clientObservabilityWebVitalsStart();
    }, []);
    return null;
}
