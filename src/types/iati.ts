// IATI (International Aid Transparency Initiative) data types

export interface IATIActivity {
  iati_identifier: string;
  title_narrative?: string | string[];
  description_narrative?: string | string[];
  reporting_org_ref?: string;
  reporting_org_narrative?: string | string[];
  activity_date_iso_date?: string | string[];
  activity_date_type?: string | string[];
  sector_code?: string | string[];
  sector_narrative?: string | string[];
  recipient_country_code?: string | string[];
  recipient_country_narrative?: string | string[];
  budget_value?: number | number[];
  transaction_value?: number | number[];
  activity_status_code?: string;
}

export interface IATITransaction {
  iati_identifier: string;
  transaction_type_code?: string;
  transaction_date_iso_date?: string;
  transaction_value?: number;
  transaction_value_currency?: string;
}

export interface IATITransactionSummary {
  total_value: number;
  by_type: {
    [typeCode: string]: {
      count: number;
      total_value: number;
    };
  };
  by_currency: {
    [currency: string]: number;
  };
  by_year: {
    [year: string]: number;
  };
  count: number;
}

export interface IATIActivitySummary {
  total_budget: number;
  by_status: {
    [status: string]: number;
  };
  by_sector: {
    [sector: string]: number;
  };
  by_country: {
    [country: string]: number;
  };
  count: number;
}

export interface IATIOrganizationData {
  org_ref: string;
  org_name: string;
  activities: IATIActivity[];  // Limited to 50 most relevant
  transaction_summary: IATITransactionSummary;  // Aggregated data
  activity_summary: IATIActivitySummary;  // Aggregated data
  stats: {
    total_activities: number;  // Total found in IATI
    stored_activities: number;  // Actually stored (limited)
    total_transactions: number;
  };
}

export interface IATIDataCollection {
  [orgKey: string]: IATIOrganizationData;
}

// Enhanced organization with IATI data
export interface OrganizationWithIATI extends NestedOrganization {
  iati_data?: IATIOrganizationData;
}

// Import the base type
import { NestedOrganization } from './airtable';
