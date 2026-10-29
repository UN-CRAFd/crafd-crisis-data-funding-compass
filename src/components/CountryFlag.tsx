"use client";

import {
  areCountryCodesLoaded,
  ensureCountryCodesLoaded,
  getCountryIsoAlpha3,
} from "@/lib/data";
import * as countries from "i18n-iso-countries";
import { Globe } from "lucide-react";
import { useEffect, useState } from "react";

// Donor groups have no ISO code, so their flags are looked up by name
const GROUP_FLAGS: Record<string, string> = {
  "european union": "eu",
  "african union": "aun",
  "craf'd": "crafd",
  "united nations": "un",
};

/**
 * Lower-case ISO alpha-2 code for a country's flag (or a key of the custom
 * flags below). Countries are matched on their ISO alpha-3 code from the data,
 * never on their name; until the codes have loaded, this returns null.
 */
export function getCountryAlpha2(input: string): string | null {
  const name = input.trim();
  if (!name) return null;

  const iso3 = getCountryIsoAlpha3(name);
  if (iso3) return countries.alpha3ToAlpha2(iso3)?.toLowerCase() ?? null;

  const lower = name.toLowerCase().replace(/\u2019/g, "'");
  if (GROUP_FLAGS[lower]) return GROUP_FLAGS[lower];
  if (
    lower.startsWith("united nations ") ||
    lower.startsWith("office of the united nations ")
  ) {
    return "un";
  }
  return null;
}

/**
 * Load the country codes and re-render once they are available. Call it in
 * components that show flags.
 */
export function useCountryCodes(): void {
  const [, setLoaded] = useState(areCountryCodesLoaded);
  useEffect(() => {
    if (!areCountryCodesLoaded()) {
      ensureCountryCodesLoaded().then(() => setLoaded(true));
    }
  }, []);
}

/**
 * Get the flag URL for a country name
 */
export function getCountryFlagUrl(country: string): string | null {
  const iso = getCountryAlpha2(country);
  if (!iso) return null;

  // Use custom flag URLs for regional organizations
  const customFlags: Record<string, string> = {
    aun: "https://flagpedia.net/data/org/w1160/au.webp",
    crafd: "/logos/crafd.png",
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

export function CountryFlag({
  country,
  width = 20,
  height = 15,
  className = "",
}: CountryFlagProps) {
  useCountryCodes();
  const flagUrl = getCountryFlagUrl(country);

  if (!flagUrl) {
    return (
      <Globe
        width={width}
        height={height}
        className={`shrink-0 rounded text-slate-400 ${className}`}
      />
    );
  }

  return (
    <img
      src={flagUrl}
      alt={`${country} flag`}
      width={width}
      height={height}
      className={`shrink-0 rounded ${className}`}
    />
  );
}
