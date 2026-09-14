import { environmentVariables } from '../env/environmentVariablesCreate';

export function webAuthnRpId(): string {
    return new URL(environmentVariables.webPageUrl).hostname;
}

export function webAuthnOrigin(): string {
    return environmentVariables.webPageUrl;
}

export function webAuthnRpName(): string {
    return 'peopleeat';
}
