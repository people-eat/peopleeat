import { readFileSync, writeFileSync } from 'node:fs';

// Nested input objects from typescript-validation-schema do not satisfy
// `ZodObject<Properties<T>>` under Zod v4 (lazy widening / nested _input optionality).
// Unwrap lazy nests and assert return types where Properties<> fails.
const path = 'src/server/graphql/generated.ts';
let source = readFileSync(path, 'utf8');

source = source.replace(
    'invoiceAddress: z.lazy(() => GqlSInvoiceAddressInputSchema()),',
    'invoiceAddress: GqlSInvoiceAddressInputSchema(),',
);

source = source.replace(
    'exactEventAddress: z.lazy(() => GqlSUserBookingRequestExactEventAddressInputSchema()),',
    'exactEventAddress: GqlSUserBookingRequestExactEventAddressInputSchema(),',
);

source = source.replace(
    'exactEventAddress: z.lazy(() => GqlSAdminBookingRequestExactEventAddressInputSchema()),',
    'exactEventAddress: GqlSAdminBookingRequestExactEventAddressInputSchema(),',
);

source = source.replace(
    'exactEventAddress: z.lazy(() => GqlSAdminBookingRequestExactEventAddressInputSchema().nullish()),',
    'exactEventAddress: GqlSAdminBookingRequestExactEventAddressInputSchema().nullish(),',
);

source = source.replaceAll(
    'sections: z.array(z.lazy(() => GqlSContentSectionInputSchema())),',
    'sections: z.array(GqlSContentSectionInputSchema()),',
);

source = source.replace(
    'cards: z.array(z.lazy(() => GqlSOccasionFormatsCardInputSchema())),',
    'cards: z.array(GqlSOccasionFormatsCardInputSchema()),',
);

source = source.replace(
    'formatsSection: z.lazy(() => GqlSOccasionFormatsSectionInputSchema()),',
    'formatsSection: GqlSOccasionFormatsSectionInputSchema(),',
);

source = source.replace(
    'courses: z.array(z.lazy(() => GqlSCookMenuCourseInputSchema())).nullish(),',
    'courses: z.array(GqlSCookMenuCourseInputSchema()).nullish(),',
);

source = source.replace(
    'meals: z.array(z.lazy(() => GqlSBookingRequestOfferConfiguredMenuMealInputSchema())),',
    'meals: z.array(GqlSBookingRequestOfferConfiguredMenuMealInputSchema()),',
);

source = source.replace(
    'courses: z.array(z.lazy(() => GqlSBookingRequestOfferConfiguredMenuCourseInputSchema())),',
    'courses: z.array(GqlSBookingRequestOfferConfiguredMenuCourseInputSchema()),',
);

source = source.replace(
    'geoCoordinates: z.lazy(() => GqlSGeoCoordinatesInputSchema().nullish()),',
    'geoCoordinates: GqlSGeoCoordinatesInputSchema().nullish(),',
);

source = source.replace(
    'lowRatingAnswers: z.lazy(() => GqlSCookTestimonialLowRatingAnswersInputSchema().nullish()),',
    'lowRatingAnswers: GqlSCookTestimonialLowRatingAnswersInputSchema().nullish(),',
);

source = source.replaceAll('cook: z.lazy(() => GqlSCookCreateSchema().nullish()),', 'cook: GqlSCookCreateSchema().nullish(),');

for (const name of [
    'GqlSGiftCardPay',
    'GqlSCityUpsert',
    'GqlSPartnerUpsert',
    'GqlSOccasionUpsert',
    'GqlSOccasionFormatsSectionInput',
    'GqlSBlogPostUpsert',
    'GqlSContentSectionInput',
    'GqlSCookMenuUpdate',
    'GqlSBookingRequestOfferConfiguredMenuCourseInput',
    'GqlSBookingRequestOfferConfiguredMenuInput',
    'GqlSUserBookingRequestCreate',
    'GqlSAdminBookingRequestCreate',
    'GqlSAdminBookingRequestUpdate',
    'GqlSAdminBookingRequestOfferAmendmentInput',
    'GqlSPublicCookFindManyCriterion',
    'GqlSUserCreate',
    'GqlSAdminUserCreate',
    'GqlSCookBookingRequestOfferTestimonialCreate',
]) {
    // `\s*` tolerates prettier wrapping the return type onto its own line when the
    // single-line signature would exceed the print width.
    const objectMarkerRegex = new RegExp(`export function ${name}Schema\\(\\):\\s*z\\.ZodObject<\\s*Properties<${name}>\\s*>\\s*\\{`);
    const typeMarkerRegex = new RegExp(`export function ${name}Schema\\(\\):\\s*z\\.ZodType<${name}>\\s*\\{`);
    const objectCast = `as z.ZodObject<Properties<${name}>>`;
    const typeCast = `as z.ZodType<${name}>`;
    const objectMatch = source.match(objectMarkerRegex);
    const typeMatch = objectMatch ? null : source.match(typeMarkerRegex);
    const match = objectMatch ?? typeMatch;
    const fnStart = match ? match.index : -1;
    const castMarker = objectMatch ? objectCast : typeCast;
    if (fnStart === -1) {
        console.warn(`fixGraphqlZodLazyNesting: ${name}Schema not found`);
        continue;
    }
    const returnStart = source.indexOf('return z.object({', fnStart);
    if (returnStart === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = returnStart + 'return '.length; i < source.length; i++) {
        const ch = source[i];
        if (ch === '(') depth++;
        if (ch === ')') {
            depth--;
            if (depth === 0) {
                end = i;
                break;
            }
        }
    }
    if (end === -1) continue;
    if (source.slice(end + 1, end + 2) === ';' && !source.slice(returnStart, end + 1).includes(castMarker)) {
        source = `${source.slice(0, end + 1)} ${castMarker}${source.slice(end + 1)}`;
    }
}

writeFileSync(path, source);
