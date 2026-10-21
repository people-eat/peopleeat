import { describe, expect, it } from 'vitest';

import { invoiceAddressNormalize } from './invoiceAddressNormalize';

describe('invoiceAddressNormalize', () => {
    it('normalizes names, city, and collapses address whitespace', () => {
        expect(
            invoiceAddressNormalize({
                companyName: '  acme   gmbh ',
                firstName: '  anna ',
                lastName: '  müller  ',
                country: ' de ',
                city: '  berlin  ',
                postalCode: ' 10115 ',
                line1: '  hauptstrasse   1 ',
                line2: '  apt   2 ',
            }),
        ).toEqual({
            companyName: 'Acme gmbh',
            firstName: 'Anna',
            lastName: 'Müller',
            country: 'DE',
            city: 'Berlin',
            postalCode: '10115',
            line1: 'hauptstrasse 1',
            line2: 'apt 2',
        });
    });

    it('clears blank company names', () => {
        expect(
            invoiceAddressNormalize({
                companyName: '   ',
                firstName: 'Ada',
                lastName: 'Lovelace',
                country: 'DE',
                city: 'Berlin',
                postalCode: '10115',
                line1: 'Street 1',
                line2: '',
            }).companyName,
        ).toBeNull();
    });
});
