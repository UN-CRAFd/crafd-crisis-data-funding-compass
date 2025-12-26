import { CountryFlag } from "./CountryFlag";
import type { DonorInfo } from "@/types/airtable";

interface DonorListProps {
  donorInfo: DonorInfo[];
  className?: string;
  showFlags?: boolean;
}

export function DonorList({
  donorInfo,
  className = "",
  showFlags = true,
}: DonorListProps) {
  if (!donorInfo || donorInfo.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {donorInfo.map((donor, index) => (
        <div
          key={`${donor.country}-${index}`}
          className={`inline-flex items-center gap-1 transition-opacity ${
            donor.isOrgLevel ? "opacity-100" : "opacity-50"
          }`}
          title={
            donor.isOrgLevel
              ? `${donor.country} (Organization Donor)`
              : `${donor.country} (Project-Only Donor)`
          }
        >
          {showFlags && <CountryFlag country={donor.country} />}
          <span className="text-sm">{donor.country}</span>
        </div>
      ))}
    </div>
  );
}
