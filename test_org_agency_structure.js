// Check how org-level agencies are structured
const fs = require('fs');
const path = require('path');

console.log('=== Checking Org-Level Agency Structure ===\n');

// Load data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);

// Find an org with Germany + Unspecified Agency
const heiGIT = organizationsData.find(org => org.name === 'HeiGIT: Heidelberg Institute for Geoinformation Technology');

if (heiGIT) {
  console.log('Organization:', heiGIT.name);
  console.log('\nOrg-level agencies:');
  (heiGIT.agencies || []).forEach((a, i) => {
    console.log(`${i + 1}. ${a.fields?.['Country Name']} - ${a.fields?.['Agency/Department Name']}`);
  });
  
  console.log('\nDonor countries:', heiGIT.donor_countries);
  
  console.log('\n\nNow checking convertToOrganizationWithProjects output:');
  console.log('In convertToOrganizationWithProjects, we create:');
  console.log('- donorCountries: extracted from donor_countries (org-level)');
  console.log('- donorInfo: includes both org-level and project-level donors');
  console.log('BUT we do NOT extract org-level agencies info!');
  console.log('\nThe org.agencies array is NOT passed to OrganizationWithProjects');
  console.log('So the filtering logic has NO ACCESS to org-level agency information!');
}

console.log('\n\n=== The Problem ===');
console.log('Current filtering logic:');
console.log('1. Checks if org has Germany as donor (org-level) ✓');
console.log('2. Filters projects by agency at PROJECT level ✗');
console.log('   - But most agencies are at ORG level, not project level!');
console.log('\nWhat we need:');
console.log('1. Extract org-level agencies in convertToOrganizationWithProjects');
console.log('2. Check if org has selected agency for selected donor at ORG level');
console.log('3. If yes, show ALL projects from that org');
console.log('4. Only filter projects by agency if they have project-level agency info');
