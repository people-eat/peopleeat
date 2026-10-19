/**
 * Stable chef sign-up funnel step ids shared by client instrumentation and
 * admin Sankey aggregation. See docs/architecture/session-events.md.
 */

export const chefSignUpFunnelSteps = ['auth', 'profile', 'created'] as const;

export type ChefSignUpFunnelStep = (typeof chefSignUpFunnelSteps)[number];

/** Client-emitted mid-funnel steps (lifecycle event covers created). */
const chefSignUpFunnelClientSteps = ['auth', 'profile'] as const;

export type ChefSignUpFunnelClientStep = (typeof chefSignUpFunnelClientSteps)[number];

export const chefSignUpFunnelArea = 'chef_sign_up' as const;

export type ChefSignUpFunnelInteraction =
    { type: 'step_entered'; step: ChefSignUpFunnelClientStep } | { type: 'step_completed'; step: ChefSignUpFunnelClientStep };

export function isChefSignUpFunnelClientStep(value: string): value is ChefSignUpFunnelClientStep {
    return (chefSignUpFunnelClientSteps as readonly string[]).includes(value);
}
