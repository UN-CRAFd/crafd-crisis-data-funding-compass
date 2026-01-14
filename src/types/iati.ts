// IATI (International Aid Transparency Initiative) data types

export interface IATIActivity {
  iati_identifier: string;
  title_narrative?: string[];
  description_narrative?: string[];
  reporting_org_ref?: string;
  reporting_org_narrative?: string[];
  participating_org_ref?: string[];
  participating_org_narrative?: string[];
  activity_date_iso_date?: string[];
  sector_code?: string[];
  sector_narrative?: string[];
  recipient_country_code?: string[];
  recipient_country_narrative?: string[];
  budget_value?: number[];
  transaction_value?: number[];
  activity_status_code?: string;
  [key: string]: any; // Allow other IATI fields
}

export interface IATITransaction {
  iati_identifier: string;
  transaction_ref?: string;
  transaction_type_code?: string;
  transaction_date_iso_date?: string;
  transaction_value?: number;
  transaction_value_currency?: string;
  transaction_provider_org_ref?: string;
  transaction_provider_org_narrative?: string[];
  transaction_receiver_org_ref?: string;
  transaction_receiver_org_narrative?: string[];
  transaction_description_narrative?: string[];
  [key: string]: any;
}

export interface IATIBudget {
  iati_identifier: string;
  budget_type?: string;
  budget_status?: string;
  budget_period_start_iso_date?: string;
  budget_period_end_iso_date?: string;
  budget_value?: number;
  budget_value_currency?: string;
  [key: string]: any;
}

export interface IATIOrganizationData {
  org_ref: string;
  org_name: string;
  activities: IATIActivity[];
  transactions: IATITransaction[];
  stats: {
    total_activities: number;
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
import { NestedOrganization } from "./airtable";
