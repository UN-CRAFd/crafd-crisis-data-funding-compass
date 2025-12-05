'use client';

import * as countries from 'i18n-iso-countries';

// Load JSON locale using require to avoid needing `resolveJsonModule` in tsconfig
let enLocale: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    enLocale = require('i18n-iso-countries/langs/en.json');
    countries.registerLocale(enLocale as unknown as import('i18n-iso-countries').LocaleData);
} catch (_e) {
    // If registration fails, we'll still attempt simple fallbacks below
    console.warn('Failed to register i18n-iso-countries locale', _e);
}

/**
 * Helper function to map country names to ISO alpha-2 codes for flag display
 */
export function getCountryAlpha2(input: string): string | null {
    let s = input.trim();
    if (!s) return null;
    
    // If already a 2-letter code
    if (/^[A-Za-z]{2}$/.test(s)) return s.toLowerCase();
    
    // Try parentheses like "Country (GB)"
    const paren = s.match(/\(([^)]+)\)/);
    if (paren) {
        const code = paren[1].trim();
        if (/^[A-Za-z]{2}$/.test(code)) return code.toLowerCase();
    }

    // Check known aliases BEFORE normalization (to preserve apostrophes, etc.)
    const aliasLower = s.toLowerCase();
    const knownAliases: Record<string, string> = {
        'usa': 'us',
        'us': 'us',
        'u.s.': 'us',
        'u.s.a.': 'us',
        'uk': 'gb',
        'u.k.': 'gb',
        'european union': 'eu',
        "craf'd": 'crafd',  // Regular apostrophe
        'african union': 'aun',
        'eu': 'eu',
        'turkiye': 'tr',
        'united nations': 'un',
        'un': 'un',
        'u.n.': 'un',
        'united nations (un)': 'un'
    };
    // Also check for curly quote variant (U+2019)
    if (aliasLower.includes('\u2019') && aliasLower.startsWith('craf')) {
        return 'crafd';
    }
    if (knownAliases[aliasLower]) return knownAliases[aliasLower];
    
    // Normalize (remove diacritics) and try direct lookup by name
    try { 
        s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); 
    } catch (e) { 
        /* ignore */ 
    }
    
    // The library expects exact English names; try direct and comma-first variant
    const direct = countries.getAlpha2Code(s, 'en');
    if (direct) return direct.toLowerCase();
    
    const commaFirst = s.split(',')[0].trim();
    const commaLookup = countries.getAlpha2Code(commaFirst, 'en');
    if (commaLookup) return commaLookup.toLowerCase();
    
    // Check if the string starts with "United Nations" (for various UN agencies)
    if (aliasLower.startsWith('united nations ')) return 'un';
    if (aliasLower.startsWith('office of the united nations ')) return 'un';

    return null;
}

/**
 * Get the flag URL for a country name
 */
export function getCountryFlagUrl(country: string): string | null {
    const iso = getCountryAlpha2(country);
    if (!iso) return null;
    
    // Use custom flag URLs for regional organizations
    const customFlags: Record<string, string> = {
        'aun': 'https://flagpedia.net/data/org/w1160/au.webp',
        'crafd': '/logos/crafd.png'
    };
    
    if (customFlags[iso]) return customFlags[iso];
    
    return `https://flagcdn.com/${iso}.svg`;
}

/**
 * Reusable country flag component
 * Can be used standalone or within badges
 */
interface CountryFlagProps {
    country: string;
    width?: number;
    height?: number;
    className?: string;
}

export function CountryFlag({ country, width = 20, height = 15, className = '' }: CountryFlagProps) {
    const flagUrl = getCountryFlagUrl(country);
    
    if (!flagUrl) return null;
    
    return (
        <img
            src={flagUrl}
            alt={`${country} flag`}
            width={width}
            height={height}
            className={`rounded shadow-sm border border-gray-200 shrink-0 ${className}`}
        />
    );
}
