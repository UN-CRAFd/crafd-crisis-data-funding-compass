/**
 * Member State Repository
 *
 * SQL queries for UN member states used by the general contributions feature.
 * Falls back to an in-code constant list if the member_states table does not exist
 * (the table is optional — populated by the data pipeline).
 */

import { queryRows } from "../db";

/**
 * The canonical list of UN member states.
 * Derived from public/data/current_member_states.csv (static UN reference data).
 * Stored here to eliminate runtime file reads.
 */
const MEMBER_STATES: string[] = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola",
  "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
  "Azerbaijan", "Bahamas (The)", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bhutan",
  "Bolivia (Plurinational State of)", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei Darussalam",
  "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Canada", "Central African Republic", "Chad", "Chile", "China",
  "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire",
  "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic People's Republic of Korea",
  "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea",
  "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland",
  "France", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Greece", "Grenada", "Guatemala", "Guinea",
  "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran (Islamic Republic of)", "Iraq",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait",
  "Kyrgyzstan", "Lao People's Democratic Republic", "Latvia", "Lebanon", "Lesotho",
  "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico",
  "Micronesia (Federated States of)", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal",
  "Netherlands (Kingdom of the)", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Macedonia", "Norway", "Oman", "Pakistan", "Palau",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Republic of Korea", "Republic of Moldova",
  "Romania", "Russian Federation", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
  "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone",
  "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia",
  "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syrian Arab Republic", "Tajikistan",
  "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United Republic of Tanzania",
  "United States", "Unknown", "Uruguay", "USA", "Uzbekistan",
  "Vanuatu", "Venezuela (Bolivarian Republic of)", "Viet Nam", "Yemen", "Zambia",
  "Zimbabwe",
];

/**
 * Try to load member states from the database table.
 * Falls back to the hard-coded constant if the table doesn't exist.
 */
export async function findAllMemberStates(): Promise<string[]> {
  try {
    const rows = await queryRows<{ name: string }>(
      "SELECT name FROM member_states ORDER BY name",
    );
    if (rows.length > 0) {
      return rows.map((r) => r.name);
    }
  } catch {
    // Table may not exist yet — fall back to constant
  }
  return [...MEMBER_STATES];
}
