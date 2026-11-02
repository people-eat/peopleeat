import type { GqlCAdminCookTestimonialPageQuery, GqlCAdminCustomerTestimonialPageQuery } from '../../graphql/generated';
import { AdminCookTestimonialPage, adminCookTestimonialPageDescription, adminCookTestimonialPageTitle } from './AdminCookTestimonialPage';
import {
    AdminCustomerTestimonialPage,
    adminCustomerTestimonialPageDescription,
    adminCustomerTestimonialPageTitle,
} from './AdminCustomerTestimonialPage';

export {
    adminCookTestimonialPageDescription,
    adminCookTestimonialPageTitle,
    adminCustomerTestimonialPageDescription,
    adminCustomerTestimonialPageTitle,
};

/**
 * Shared admin testimonial detail entry. Routes stay typed
 * (`/testimonials/customer/$id` vs `/testimonials/cook/$id`); this component
 * owns the kind switch so both surfaces share one page entry point.
 */
export function AdminTestimonialPage(
    props:
        | { kind: 'customer'; data: GqlCAdminCustomerTestimonialPageQuery; customerTestimonialId: string }
        | { kind: 'cook'; data: GqlCAdminCookTestimonialPageQuery; cookTestimonialId: string },
) {
    if (props.kind === 'customer') {
        return <AdminCustomerTestimonialPage data={props.data} customerTestimonialId={props.customerTestimonialId} />;
    }
    return <AdminCookTestimonialPage data={props.data} cookTestimonialId={props.cookTestimonialId} />;
}
