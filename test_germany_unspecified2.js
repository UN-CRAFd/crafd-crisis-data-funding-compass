// Test Germany + Unspecified Agency - check both org-level and project-level agencies
const fs = require('fs');
const path = require('path');

console.log('=== Investigating Germany + Unspecified Agency ===\n');

// Load data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);

console.log('Checking data structure of first few orgs...\n');

// Check first org structure
const firstOrg = organizationsData[0];
console.log('First org keys:', Object.keys(firstOrg));
console.log('Has "agencies" at org level?', 'agencies' in firstOrg);
console.log('Has "Org Donor Agencies" in fields?', firstOrg.fields?.['Org Donor Agencies'] ? 'yes' : 'no');
console.log('');

// Find orgs with Germany in donor_countries
const orgsWithGermany = organizationsData.filter(org => 
  (org.donor_countries || []).includes('Germany')
);

console.log(`Organizations with Germany as donor (any level): ${orgsWithGermany.length}\n`);

// Now check which ones have "Unspecified Agency" in their org-level agencies
let germanOrgsWithUnspecifiedAgency = [];

orgsWithGermany.forEach(org => {
  // Check org-level agencies
  const orgAgencies = org.agencies || [];
  const hasGermanyUnspecified = orgAgencies.some(a => {
    const country = a.fields?.['Country Name'];
    const agency = a.fields?.['Agency/Department Name'];
    return country === 'Germany' && agency === 'Unspecified Agency';
  });
  
  if (hasGermanyUnspecified) {
    germanOrgsWithUnspecifiedAgency.push(org.name);
  }
});

console.log(`Organizations with Germany + Unspecified Agency at ORG level: ${germanOrgsWithUnspecifiedAgency.length}`);
if (germanOrgsWithUnspecifiedAgency.length > 0) {
  console.log('First 10:', germanOrgsWithUnspecifiedAgency.slice(0, 10));
}
console.log('');

// Now let's combine: orgs that have Germany as donor AND have at least one project
// This is what the filtering logic should show
let orgsWithGermanyThatHaveProjects = [];
orgsWithGermany.forEach(org => {
  const hasProjects = (org.projects || []).length > 0;
  if (hasProjects) {
    const orgAgencies = org.agencies || [];
    const hasGermanyUnspecified = orgAgencies.some(a => {
      const country = a.fields?.['Country Name'];
      const agency = a.fields?.['Agency/Department Name'];
      return country === 'Germany' && agency === 'Unspecified Agency';
    });
    
    if (hasGermanyUnspecified) {
      orgsWithGermanyThatHaveProjects.push({
        name: org.name,
        projectCount: org.projects.length
      });
    }
  }
});

console.log(`Organizations with Germany + Unspecified Agency that have projects: ${orgsWithGermanyThatHaveProjects.length}`);
if (orgsWithGermanyThatHaveProjects.length > 0) {
  console.log('\nList:');
  orgsWithGermanyThatHaveProjects.forEach((org, i) => {
    console.log(`${i + 1}. ${org.name} (${org.projectCount} projects)`);
  });
  
  const totalProjects = orgsWithGermanyThatHaveProjects.reduce((sum, org) => sum + org.projectCount, 0);
  console.log(`\nTotal projects: ${totalProjects}`);
}

console.log('\n=== Hypothesis ===');
console.log('When filtering by Germany + Unspecified Agency:');
console.log('- Show orgs that have Germany as donor');
console.log('- AND have "Unspecified Agency" in their org-level agencies');
console.log('- Show ALL their projects (not filtered by project-level agencies)');
console.log('\nThis would give us:', orgsWithGermanyThatHaveProjects.length, 'orgs');
