import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Host element inside a modal layer (Dialog, …) for Base UI portals.
 * Keeps Combobox / similar popups in the dialog's pointer-events and dismiss
 * subtree so Radix `react-remove-scroll` does not block clicks.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);

export function PortalContainerProvider({ container, children }: { container: HTMLElement | null; children: ReactNode }) {
    return <PortalContainerContext.Provider value={container}>{children}</PortalContainerContext.Provider>;
}

export function usePortalContainer() {
    return useContext(PortalContainerContext);
}
