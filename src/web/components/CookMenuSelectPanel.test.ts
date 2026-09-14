import { describe, expect, it } from 'vitest';

import { cookMenuSelectPanelMenusSortByEvaluation } from './CookMenuSelectPanel';

describe('cookMenuSelectPanelMenusSortByEvaluation', () => {
    it('orders suitable menus before unevaluated, then unsuitable', () => {
        const menus = [{ menuId: 'a' }, { menuId: 'b' }, { menuId: 'c' }];
        const sorted = cookMenuSelectPanelMenusSortByEvaluation(menus, [
            { menuId: 'c', evaluationSummary: 'ok', isSuitable: true },
            { menuId: 'a', evaluationSummary: 'no', isSuitable: false },
        ]);
        expect(sorted.map((menu) => menu.menuId)).toEqual(['c', 'b', 'a']);
    });

    it('keeps original order when there are no evaluations', () => {
        const menus = [{ menuId: 'a' }, { menuId: 'b' }];
        expect(cookMenuSelectPanelMenusSortByEvaluation(menus, null).map((menu) => menu.menuId)).toEqual(['a', 'b']);
    });
});
