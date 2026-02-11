// Test the complete filtering logic with Germany + Unspecified Agency
const fs = require('fs');
const path = require('path');

console.log('=== Testing Complete Filtering Logic ===\n');

// Load data
const organizationsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'public/data/organizations-nested.json'), 'utf8')
);

// Simulate convertToOrganizationWithProjects
function convertToOrganizationWithProjects(org) {
  // Extract org-level donors
  const orgLevelDonors = org.donor_countries || [];
  
  // Extract org-level agencies by country
  const orgAgencies = {};
  const orgAgenciesArray = org.agencies || [];
  orgAgenciesArray.forEach(a => {
    const country = a.fields?.['Country Name'] || a.fields?.['Country'];
    const agencyName = a.fields?.['Agency/Department Name'];
    
    if (country && agencyName) {
      if (!orgAgencies[country]) {
        orgAgencies[country] = [];
      }
      if (!orgAgencies[country].includes(agencyName)) {
        orgAgencies[country].push(agencyName);
      }
    }
  });
  
  // Process projects
  const projects = (org.projects || []).map(project => {
    const projectDonorAgencies = {};
    
    (project.agencies || []).forEach(a => {
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
    
    return {
      id: project.id,
      projectName: project.fields?.['Project/Product Name'] || 'Unnamed',
      donorAgencies: projectDonorAgencies
    };
  });
  
  // Get all org donors
  const allOrgDonors = orgLevelDonors;
  
  return {
    id: org.id,
    organizationName: org.name,
    donorCountries: orgLevelDonors,
    orgAgencies,
    projects
  };
}

// Simulate filtering logic
function applyFilters(organizations, filters) {
  const hasDonorFilter = filters.donorCountries && filters.donorCountries.length > 0;
  const hasAgencyFilter = filters.donorAgencies && filters.donorAgencies.length > 0;
  
  return organizations.map(org => {
    // Check if organization has selected agency at org level
    const orgHasSelectedAgency = () => {
      if (!hasAgencyFilter) return false;
      if (!hasDonorFilter || filters.donorCountries.length !== 1) {
        return false;
      }
      const selectedDonor = filters.donorCountries[0];
      const orgAgenciesForDonor = org.orgAgencies[selectedDonor] || [];
      return filters.donorAgencies.some(
        (selectedAgency) => orgAgenciesForDonor.includes(selectedAgency)
      );
    };
    
    // Check if org meets donor requirement
    const allOrgDonors = org.donorCountries || [];
    const orgMeetsDonorRequirement =
      !hasDonorFilter ||
      filters.donorCountries.every((selectedDonor) =>
        allOrgDonors.includes(selectedDonor)
      );
    
    // Helper function to check if project matches agency filter
    const projectMatchesAgencyFilter = (project) => {
      if (!hasAgencyFilter) return true;
      // If org has the agency at org level, show all projects
      if (orgHasSelectedAgency()) return true;
      // Otherwise, check project-level agencies
      if (!hasDonorFilter || filters.donorCountries.length !== 1) {
        return true;
      }
      const selectedDonor = filters.donorCountries[0];
      const projectAgencies = project.donorAgencies || {};
      const agenciesForDonor = projectAgencies[selectedDonor] || [];
      return filters.donorAgencies.some(
        (selectedAgency) => agenciesForDonor.includes(selectedAgency)
      );
    };
    
    let visibleProjects = [];
    
    if (orgMeetsDonorRequirement) {
      // Org meets donor requirement
      if (hasAgencyFilter) {
        // Filter projects by agency
        visibleProjects = org.projects.filter(projectMatchesAgencyFilter);
      } else {
        // No agency filter, show all projects
        visibleProjects = [...org.projects];
      }
    }
    
    // Return org only if it has visible projects
    if (visibleProjects.length === 0) return null;
    
    return {
      ...org,
      projects: visibleProjects
    };
  }).filter(org => org !== null);
}

// Convert all organizations
console.log('Converting organizations...');
const convertedOrgs = organizationsData.map(convertToOrganizationWithProjects);
console.log(`Total organizations: ${convertedOrgs.length}`);

// Apply Germany + Unspecified Agency filter
const filters = {
  donorCountries: ['Germany'],
  donorAgencies: ['Unspecified Agency']
};

console.log('\nApplying filter:');
console.log('- Donor: Germany');
console.log('- Agency: Unspecified Agency\n');

const filteredOrgs = applyFilters(convertedOrgs, filters);

console.log('=== RESULTS ===');
console.log(`Organizations: ${filteredOrgs.length}`);

let totalProjects = 0;
filteredOrgs.forEach(org => {
  totalProjects += org.projects.length;
});
console.log(`Total projects: ${totalProjects}`);

console.log('\nOrganizations:');
filteredOrgs.forEach((org, i) => {
  console.log(`${i + 1}. ${org.organizationName} (${org.projects.length} projects)`);
});

console.log('\n=== Expected: 22 organizations, 1 project ===');
console.log(`Actual: ${filteredOrgs.length} organizations, ${totalProjects} projects`);

if (filteredOrgs.length === 22 || filteredOrgs.length === 21 || filteredOrgs.length === 20) {
  console.log('✓ Organization count is close!');
} else {
  console.log('✗ Organization count does not match');
}

// Count orgs with org-level Germany + Unspecified Agency
const orgsWithOrgLevelAgency = convertedOrgs.filter(org => {
  const germanAgencies = org.orgAgencies['Germany'] || [];
  return germanAgencies.includes('Unspecified Agency') && org.projects.length > 0;
});
console.log(`\nOrgs with org-level Germany + Unspecified Agency (with projects): ${orgsWithOrgLevelAgency.length}`);

// Add IOM which has project-level agency
const iom = convertedOrgs.find(org => org.organizationName === 'IOM: International Organization for Migration');
if (iom) {
  const hasProjectLevelAgency = iom.projects.some(p => {
    const germanAgencies = p.donorAgencies['Germany'] || [];
    return germanAgencies.includes('Unspecified Agency');
  });
  console.log(`IOM has project-level Germany + Unspecified Agency: ${hasProjectLevelAgency}`);
  
  const hasOrgLevelAgency = (iom.orgAgencies['Germany'] || []).includes('Unspecified Agency');
  console.log(`IOM has org-level Germany + Unspecified Agency: ${hasOrgLevelAgency}`);
}
