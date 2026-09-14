/** Per-corner radii in CSS pixels (asymmetric rounded rects). */
export type CornerRadii = {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
};

function clampRadii(width: number, height: number, radii: CornerRadii): CornerRadii {
    let { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = radii;

    const scalePair = (a: number, b: number, max: number): [number, number] => {
        const sum = a + b;
        if (sum <= max || sum === 0) return [a, b];
        const scale = max / sum;
        return [a * scale, b * scale];
    };

    [tl, tr] = scalePair(tl, tr, width);
    [bl, br] = scalePair(bl, br, width);
    [tl, bl] = scalePair(tl, bl, height);
    [tr, br] = scalePair(tr, br, height);

    return {
        topLeft: Math.max(0, tl),
        topRight: Math.max(0, tr),
        bottomRight: Math.max(0, br),
        bottomLeft: Math.max(0, bl),
    };
}

/**
 * SVG path `d` for a rect with four independent corner radii.
 * Optional `inset` shrinks the rect and each radius (for centering a stroke inside a box).
 */
export function roundedRectPath(width: number, height: number, radii: CornerRadii, inset = 0): string {
    const innerWidth = width - inset * 2;
    const innerHeight = height - inset * 2;
    if (innerWidth <= 0 || innerHeight <= 0) return '';

    const {
        topLeft: tl,
        topRight: tr,
        bottomRight: br,
        bottomLeft: bl,
    } = clampRadii(innerWidth, innerHeight, {
        topLeft: Math.max(0, radii.topLeft - inset),
        topRight: Math.max(0, radii.topRight - inset),
        bottomRight: Math.max(0, radii.bottomRight - inset),
        bottomLeft: Math.max(0, radii.bottomLeft - inset),
    });

    const x = inset;
    const y = inset;
    const right = x + innerWidth;
    const bottom = y + innerHeight;

    const parts = [`M ${x + tl} ${y}`, `H ${right - tr}`];

    if (tr > 0) parts.push(`A ${tr} ${tr} 0 0 1 ${right} ${y + tr}`);
    else parts.push(`L ${right} ${y}`);

    parts.push(`V ${bottom - br}`);

    if (br > 0) parts.push(`A ${br} ${br} 0 0 1 ${right - br} ${bottom}`);
    else parts.push(`L ${right} ${bottom}`);

    parts.push(`H ${x + bl}`);

    if (bl > 0) parts.push(`A ${bl} ${bl} 0 0 1 ${x} ${bottom - bl}`);
    else parts.push(`L ${x} ${bottom}`);

    parts.push(`V ${y + tl}`);

    if (tl > 0) parts.push(`A ${tl} ${tl} 0 0 1 ${x + tl} ${y}`);
    else parts.push(`L ${x} ${y}`);

    parts.push('Z');
    return parts.join(' ');
}
