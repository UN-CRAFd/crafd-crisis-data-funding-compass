// Re-test with different interpretation:
// Show orgs with Germany as donor, but ONLY show projects funded by Germany + Unspecified Agency
const fs = require('fs');
const path = require('path');

console.log('=== Testing Alternative Interpretation ===\n');

// Load data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);

// Find ALL orgs with Germany as donor
const orgsWithGermany = organizationsData.filter(org => 
  (org.donor_countries || []).includes('Germany')
);

console.log(`Organizations with Germany as donor: ${orgsWithGermany.length}`);

// Now, within those orgs, find ONLY projects with Germany + Unspecified Agency
let resultOrgs = [];
let totalProjects = 0;

orgsWithGermany.forEach(org => {
  // Check org-level agencies
  const orgAgencies = {};
  (org.agencies || []).forEach(a => {
    const country = a.fields?.['Country Name'];
    const agency = a.fields?.['Agency/Department Name'];
    if (country && agency) {
      if (!orgAgencies[country]) orgAgencies[country] = [];
      if (!orgAgencies[country].includes(agency)) {
        orgAgencies[country].push(agency);
      }
    }
  });
  
  const orgHasGermanyUnspecified = (orgAgencies['Germany'] || []).includes('Unspecified Agency');
  
  // Find projects with Germany + Unspecified Agency (either org-level or project-level)
  const matchingProjects = (org.projects || []).filter(project => {
    // If org has the agency at org level, include all projects funded by Germany
    if (orgHasGermanyUnspecified) {
      // Check if project has Germany as donor (at project level)
      const projectAgencies = project.agencies || [];
      const projectHasGermany = projectAgencies.some(a => 
        a.fields?.['Country Name'] === 'Germany'
      );
      
      // If project has Germany-specific agencies, only show if it includes Unspecified Agency
      if (projectAgencies.some(a => a.fields?.['Country Name'] === 'Germany')) {
        return projectAgencies.some(a => 
          a.fields?.['Country Name'] === 'Germany' && 
          a.fields?.['Agency/Department Name'] === 'Unspecified Agency'
        );
      }
      
      // If project has no agencies, include it (org-level applies)
      return projectAgencies.length === 0;
    }
    
    // Check if project has Germany + Unspecified Agency at project level
    return (project.agencies || []).some(a =>
      a.fields?.['Country Name'] === 'Germany' &&
      a.fields?.['Agency/Department Name'] === 'Unspecified Agency'
    );
  });
  
  if (matchingProjects.length > 0) {
    resultOrgs.push({
      name: org.name,
      projectCount: matchingProjects.length,
      projects: matchingProjects.map(p => p.fields?.['Project/Product Name'] || 'Unnamed')
    });
    totalProjects += matchingProjects.length;
  }
});

console.log('\n=== RESULTS (Alternative Interpretation) ===');
console.log(`Organizations: ${resultOrgs.length}`);
console.log(`Total projects: ${totalProjects}\n`);

console.log('Organizations with matching projects:');
resultOrgs.forEach((org, i) => {
  console.log(`${i + 1}. ${org.name} (${org.projectCount} projects)`);
  if (org.projectCount <= 3) {
    org.projects.forEach(p => console.log(`   - ${p}`));
  }
});

console.log('\n=== Expected: 22 organizations, 1 project ===');
console.log(`Actual: ${resultOrgs.length} organizations, ${totalProjects} projects`);

// Let's also try: ONLY projects with explicit Germany + Unspecified Agency at PROJECT level
console.log('\n\n=== Testing: ONLY project-level Germany + Unspecified Agency ===');

let projectLevelOnly = [];
let projectLevelTotal = 0;

organizationsData.forEach(org => {
  const matchingProjects = (org.projects || []).filter(project =>
    (project.agencies || []).some(a =>
      a.fields?.['Country Name'] === 'Germany' &&
      a.fields?.['Agency/Department Name'] === 'Unspecified Agency'
    )
  );
  
  if (matchingProjects.length > 0) {
    projectLevelOnly.push({
      name: org.name,
      projectCount: matchingProjects.length,
      projects: matchingProjects.map(p => p.fields?.['Project/Product Name'] || 'Unnamed')
    });
    projectLevelTotal += matchingProjects.length;
  }
});

console.log(`Organizations: ${projectLevelOnly.length}`);
console.log(`Total projects: ${projectLevelTotal}\n`);

projectLevelOnly.forEach((org, i) => {
  console.log(`${i + 1}. ${org.name}`);
  org.projects.forEach(p => console.log(`   - ${p}`));
});
