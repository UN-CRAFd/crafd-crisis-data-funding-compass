"use client";

import React from "react";
import { getCountryAlpha2, useCountryCodes } from "./CountryFlag";

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
  renderValue,
}: HeadquartersCountryProps): React.ReactElement | null {
  useCountryCodes();
  if (!countryValue || countryValue.trim().length === 0) {
    return null;
  }

  const iso = getCountryAlpha2(countryValue);
  const label = countryValue;

  return (
    <Field label="Headquarters Country">
      <div className="flex items-center gap-2">
        {iso && (
          <img
            src={`https://flagcdn.com/${iso}.svg`}
            alt={`${label} flag`}
            width={32}
            height={24}
            className="rounded border border-gray-200 shadow"
          />
        )}
        <FieldValue>{renderValue(countryValue)}</FieldValue>
      </div>
    </Field>
  );
}
