import { useEffect } from 'react';

import { clientObservabilityWebVitalsStart } from './clientObservability';

/** Mounts browser RUM collectors (Web Vitals). See docs/architecture/observability.md. */
export function ClientObservabilityBootstrap() {
    useEffect(() => {
        clientObservabilityWebVitalsStart();
    }, []);
    return null;
}
