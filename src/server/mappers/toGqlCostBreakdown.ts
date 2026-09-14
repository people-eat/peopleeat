import type { CostBreakdown, CostLineItem } from '../domain/bookingRequestOfferCostBreakdown';
import type { GqlSCostBreakdown, GqlSCostLineItem } from '../graphql/generated';

function toGqlCostLineItem(item: CostLineItem): GqlSCostLineItem {
    return {
        title: item.title,
        amountCents: item.amountCents,
        subLineItems: item.subLineItems?.map(toGqlCostLineItem) ?? null,
    };
}

export function toGqlCostBreakdown(breakdown: CostBreakdown): GqlSCostBreakdown {
    return {
        lineItems: breakdown.lineItems.map(toGqlCostLineItem),
        total: breakdown.total ? toGqlCostLineItem(breakdown.total) : null,
        totalPerPerson: breakdown.totalPerPerson ? toGqlCostLineItem(breakdown.totalPerPerson) : null,
        totalBeforeDiscount: breakdown.totalBeforeDiscount ? toGqlCostLineItem(breakdown.totalBeforeDiscount) : null,
    };
}
