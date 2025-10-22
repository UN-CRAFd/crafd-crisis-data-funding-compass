'use client';

import React from 'react';
// Use i18n-iso-countries for robust country name -> alpha-2 mapping
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

interface HeadquartersCountryProps {
    countryValue: string;
    Field: React.ComponentType<{ label: string; children: React.ReactNode }>;
    FieldValue: React.ComponentType<{ children: React.ReactNode }>;
    renderValue: (val: unknown) => React.ReactNode;
}

/**
 * Component to display organization headquarters country with flag
 * Can be easily commented out in parent components when not needed
 */
export default function HeadquartersCountry({ 
    countryValue, 
    Field, 
    FieldValue, 
    renderValue 
}: HeadquartersCountryProps): React.ReactElement | null {
    if (!countryValue || countryValue.trim().length === 0) {
        return null;
    }

    // Use i18n-iso-countries to resolve a best-effort alpha-2 code
    const getCountryAlpha2 = (input: string): string | null => {
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
        
        // Last-resort: try lowercased simple variants (e.g., 'usa' -> 'US')
        const alias = s.toLowerCase();
        const knownAliases: Record<string, string> = {
            'usa': 'us', 
            'us': 'us', 
            'u.s.': 'us', 
            'u.s.a.': 'us', 
            'uk': 'gb', 
            'u.k.': 'gb'
        };
        if (knownAliases[alias]) return knownAliases[alias];
        
        return null;
    };

    const iso = getCountryAlpha2(countryValue);
    const label = countryValue;
    const src = iso 
        ? `https://flagcdn.com/${iso}.svg` 
        : `https://flagcdn.com/${encodeURIComponent(label.toLowerCase())}.svg`;

    return (
        <Field label="Headquarters Country">
            <div className="flex items-center gap-2">
                {/* Flag image */}
                <img
                    src={src}
                    alt={`${label} flag`}
                    width={32}
                    height={24}
                    className="rounded shadow border border-gray-200"
                />
                <FieldValue>{renderValue(countryValue)}</FieldValue>
            </div>
        </Field>
    );
}
