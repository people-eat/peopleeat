import { pathNameSlugify } from '../../shared/contentSection';
import { occasionFormatsSectionSchema } from '../../shared/occasionFormatsSection';
import type { OccasionFormatsSection } from '../../shared/occasionFormatsSection';
import type { GqlSContentSectionInput, GqlSOccasionFormatsSectionInput } from '../graphql/generated';
import { contentSectionsFromInput } from '../mappers/toGqlContentSection';

export function contentPathNameNormalize(pathName: string): string {
    const slug = pathNameSlugify(pathName.trim());
    if (!slug) {
        throw new Error('pathName must not be empty');
    }
    return slug;
}

export function contentSectionsParseOrThrow(inputs: readonly GqlSContentSectionInput[]) {
    try {
        return contentSectionsFromInput(inputs);
    } catch (error) {
        throw new Error(`Invalid content sections: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function occasionFormatsSectionParseOrThrow(input: GqlSOccasionFormatsSectionInput): OccasionFormatsSection {
    try {
        return occasionFormatsSectionSchema.parse(input);
    } catch (error) {
        throw new Error(`Invalid occasion formats section: ${error instanceof Error ? error.message : String(error)}`);
    }
}

export function previousPathNamesArchive(existing: string[] | null | undefined, oldPathName: string, nextPathName: string): string[] {
    if (oldPathName === nextPathName) {
        return existing ?? [];
    }
    const prior = new Set(existing ?? []);
    prior.add(oldPathName);
    prior.delete(nextPathName);
    return [...prior];
}
