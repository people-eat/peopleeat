/** Import-preserved session geo payload (`Sessions.geoInformation`). */
export type SessionGeoInformation = {
    continent: {
        code: string;
        name: string;
    } | null;
    country: {
        code: string;
        name: string;
    } | null;
    state: {
        code: string;
        name: string;
    } | null;
    city: {
        name: string;
    } | null;
    coordinates: {
        latitude: number;
        longitude: number;
    } | null;
    timezone?: string;
};
