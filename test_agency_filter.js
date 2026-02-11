// Test file to verify agency filtering logic
const fs = require('fs');
const path = require('path');

// Load the actual data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);
const agenciesData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/agencies-table.json'), 'utf8')
);

console.log('=== Testing Agency Filtering Logic ===\n');

// Build agencies map from agencies-table.json (like getAgenciesForDonors does)
const countryAgenciesMap = new Map();
agenciesData.forEach(agency => {
  const countryName = agency.fields?.["Country Name"];
  const agencyName = agency.fields?.["Agency/Department Name"];
  
  if (countryName && agencyName) {
    const existing = countryAgenciesMap.get(countryName) || [];
    if (!existing.includes(agencyName)) {
      existing.push(agencyName);
      countryAgenciesMap.set(countryName, existing);
    }
  }
});

console.log('Sample agencies for USA:', countryAgenciesMap.get('USA')?.slice(0, 5));
console.log('Sample agencies for Germany:', countryAgenciesMap.get('Germany')?.slice(0, 5));
console.log('');

// Test with Harvard Humanitarian Initiative (HHI)
const hhi = organizationsData.find(org => org.fields?.org_key === 'hhi');
if (hhi) {
  console.log('=== Testing with Harvard Humanitarian Initiative ===');
  console.log('Organization:', hhi.name);
  console.log('');
  
  // Find a project with agencies
  const projectWithAgencies = hhi.projects?.find(p => p.agencies?.length > 0);
  if (projectWithAgencies) {
    console.log('Project:', projectWithAgencies.fields?.['Project/Product Name']);
    console.log('Project agencies:');
    projectWithAgencies.agencies.forEach(a => {
      const country = a.fields?.['Country Name'];
      const agency = a.fields?.['Agency/Department Name'];
      console.log(`  - ${country}: ${agency}`);
    });
    console.log('');
    
    // Build projectDonorAgencies like convertToOrganizationWithProjects does
    const projectDonorAgencies = {};
    projectWithAgencies.agencies.forEach(a => {
      const country = a.fields?.['Country Name'];
      const agency = a.fields?.['Agency/Department Name'];
      
      if (country && agency) {
        if (!projectDonorAgencies[country]) {
          projectDonorAgencies[country] = [];
        }
        if (!projectDonorAgencies[country].includes(agency)) {
          projectDonorAgencies[country].push(agency);
        }
      }
    });
    
    console.log('projectDonorAgencies map:', JSON.stringify(projectDonorAgencies, null, 2));
    console.log('');
    
    // Test filtering logic
    const selectedDonor = 'USA';
    const selectedAgencies = ['National Institutes of Health (NIH)'];
    
    console.log(`Testing filter: Donor="${selectedDonor}", Agency="${selectedAgencies[0]}"`);
    
    const agenciesForDonor = projectDonorAgencies[selectedDonor] || [];
    console.log('Agencies for donor in project:', agenciesForDonor);
    
    const matchesAgency = selectedAgencies.some(
      (selectedAgency) => agenciesForDonor.includes(selectedAgency)
    );
    
    console.log('Match result:', matchesAgency);
    console.log('');
  }
}

// Test with a German organization
console.log('\n=== Looking for German-funded projects ===');
let foundGerman = false;
for (const org of organizationsData.slice(0, 50)) {
  for (const project of org.projects || []) {
    const hasGermanAgency = project.agencies?.some(a => 
      a.fields?.['Country Name'] === 'Germany'
    );
    if (hasGermanAgency) {
      console.log('Organization:', org.name);
      console.log('Project:', project.fields?.['Project/Product Name']);
      console.log('Project agencies:');
      project.agencies.forEach(a => {
        const country = a.fields?.['Country Name'];
        const agency = a.fields?.['Agency/Department Name'];
        console.log(`  - ${country}: ${agency}`);
      });
      
      // Build projectDonorAgencies
      const projectDonorAgencies = {};
      project.agencies.forEach(a => {
        const country = a.fields?.['Country Name'];
        const agency = a.fields?.['Agency/Department Name'];
        
        if (country && agency) {
          if (!projectDonorAgencies[country]) {
            projectDonorAgencies[country] = [];
          }
          if (!projectDonorAgencies[country].includes(agency)) {
            projectDonorAgencies[country].push(agency);
          }
        }
      });
      
      console.log('projectDonorAgencies map:', JSON.stringify(projectDonorAgencies, null, 2));
      
      // Test with Federal Foreign Office
      const germanAgencies = countryAgenciesMap.get('Germany') || [];
      console.log('Available German agencies in agencies-table.json:', germanAgencies.slice(0, 3));
      
      const selectedAgency = germanAgencies[0]; // Pick first agency
      if (selectedAgency) {
        console.log(`\nTesting filter: Donor="Germany", Agency="${selectedAgency}"`);
        
        const agenciesForDonor = projectDonorAgencies['Germany'] || [];
        console.log('Agencies for donor in project:', agenciesForDonor);
        
        const matchesAgency = [selectedAgency].some(
          (selectedAgency) => agenciesForDonor.includes(selectedAgency)
        );
        
        console.log('Match result:', matchesAgency);
      }
      
      foundGerman = true;
      break;
    }
  }
  if (foundGerman) break;
}

console.log('\n=== Test Complete ===');
