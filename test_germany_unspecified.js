// Test Germany + Unspecified Agency filtering
const fs = require('fs');
const path = require('path');

console.log('=== Testing Germany + Unspecified Agency ===\n');

// Load data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);

// Find all organizations that have projects funded by Germany through "Unspecified Agency"
let orgsWithGermanyUnspecified = [];
let totalProjectsCount = 0;

organizationsData.forEach(org => {
  const projects = org.projects || [];
  let orgMatchingProjectsCount = 0;
  
  projects.forEach(project => {
    const agencies = project.agencies || [];
    
    // Check if project has Germany + Unspecified Agency
    const hasGermanyUnspecified = agencies.some(a => {
      const country = a.fields?.['Country Name'];
      const agency = a.fields?.['Agency/Department Name'];
      return country === 'Germany' && agency === 'Unspecified Agency';
    });
    
    if (hasGermanyUnspecified) {
      orgMatchingProjectsCount++;
      totalProjectsCount++;
      
      if (orgMatchingProjectsCount === 1) {
        // First matching project for this org
        console.log(`\nOrg: ${org.name}`);
      }
      
      console.log(`  Project: ${project.fields?.['Project/Product Name'] || 'Unnamed'}`);
      console.log(`    Agencies:`, agencies.map(a => 
        `${a.fields?.['Country Name']} - ${a.fields?.['Agency/Department Name']}`
      ).join(', '));
    }
  });
  
  if (orgMatchingProjectsCount > 0) {
    orgsWithGermanyUnspecified.push({
      name: org.name,
      projectCount: orgMatchingProjectsCount
    });
  }
});

console.log('\n\n=== SUMMARY ===');
console.log(`Total organizations with Germany + Unspecified Agency: ${orgsWithGermanyUnspecified.length}`);
console.log(`Total projects: ${totalProjectsCount}`);

console.log('\nOrganizations list:');
orgsWithGermanyUnspecified.forEach((org, i) => {
  console.log(`${i + 1}. ${org.name} (${org.projectCount} project${org.projectCount > 1 ? 's' : ''})`);
});

console.log('\n=== Expected: 22 organizations, 1 project ===');
console.log(`Actual: ${orgsWithGermanyUnspecified.length} organizations, ${totalProjectsCount} projects`);

if (orgsWithGermanyUnspecified.length !== 22) {
  console.log('\n⚠️  Organization count DOES NOT MATCH!');
} else {
  console.log('\n✓ Organization count matches!');
}

if (totalProjectsCount !== 1) {
  console.log('⚠️  Project count DOES NOT MATCH!');
} else {
  console.log('✓ Project count matches!');
}
