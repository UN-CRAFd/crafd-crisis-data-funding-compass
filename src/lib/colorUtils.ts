/**
 * Color Utilities
 * Shared color computation and intensity helpers
 */

/**
 * Get brand color from CSS variables
 * Cached for performance - retrieves from document root
 */
export const getBrandColor = (varName: string): string => {
    if (typeof window !== 'undefined') {
        const color = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
        return color || '#e6af26'; // Fallback to amber
    }
    return '#e6af26';
};

/**
 * Get color intensity for organizations (amber scale)
 * Used in Analytics matrix views
 */
export const getOrgColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const intensity = Math.min(Math.ceil((count / max) * 5), 5);
    const colorMap: Record<number, string> = {
        1: 'bg-amber-100',
        2: 'bg-amber-200',
        3: 'bg-amber-300',
        4: 'bg-amber-400',
        5: 'bg-amber-500'
    };
    return colorMap[intensity] || 'bg-slate-50';
};

/**
 * Get color intensity for projects (indigo/purple scale)
 * Used in Analytics matrix views
 */
export const getProjectColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-indigo-100';
    if (ratio <= 0.4) return 'bg-indigo-200';
    if (ratio <= 0.6) return 'bg-indigo-300';
    if (ratio <= 0.8) return 'bg-indigo-400';
    return 'bg-indigo-500';
};

/**
 * Brand color palette configuration
 * Returns commonly used brand colors from CSS variables
 */
export const getBrandColors = () => ({
    brandPrimary: getBrandColor('--brand-primary'),
    brandPrimaryDark: getBrandColor('--brand-primary-dark'),
    brandPrimaryLight: getBrandColor('--brand-primary-light'),
    brandBgLight: getBrandColor('--brand-bg-light'),
    brandBgLighter: getBrandColor('--brand-bg-lighter'),
    badgeOtherBg: getBrandColor('--badge-other-bg'),
    badgeOtherText: getBrandColor('--badge-other-text'),
    badgeSlateBg: getBrandColor('--badge-slate-bg'),
    badgeSlateText: getBrandColor('--badge-slate-text'),
});
