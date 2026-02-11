/**
 * Test script to verify agency filtering bug fix
 * 
 * Bug: When filtering by Germany + ALL its agencies, should show same results as Germany alone
 * Fix: Detect when all agencies are selected and treat it as no agency filter
 */

const fs = require('fs');
const path = require('path');

// Load data
const orgsData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'public/data/organizations-nested.json'),
    'utf-8'
  )
);

const agenciesData = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'public/data/agencies-table.json'),
    'utf-8'
  )
);

// Get Germany agencies
const germanyAgencies = agenciesData
  .filter(a => a.fields?.["Country Name"] === "Germany")
  .map(a => a.fields?.["Agency/Department Name"])
  .filter(Boolean);

console.log('\n🇩🇪 Germany Agencies Found:', germanyAgencies.length);
console.log(germanyAgencies.map((a, i) => `  ${i + 1}. ${a}`).join('\n'));

// Function to check if org is funded by Germany
function isFundedByGermany(org) {
  // Check org-level agencies
  const orgAgencies = org.agencies || [];
  const hasGermanyAtOrgLevel = orgAgencies.some(
    a => a.fields?.["Country Name"] === "Germany"
  );
  
  // Check project-level agencies
  const hasGermanyAtProjectLevel = (org.projects || []).some(project =>
    (project.agencies || []).some(
      a => a.fields?.["Country Name"] === "Germany"
    )
  );
  
  return hasGermanyAtOrgLevel || hasGermanyAtProjectLevel;
}

// Function to count projects with Germany funding
function countGermanyProjects(org) {
  const allProjects = org.projects || [];
  
  // Check if org has Germany at org-level
  const orgAgencies = org.agencies || [];
  const hasGermanyAtOrgLevel = orgAgencies.some(
    a => a.fields?.["Country Name"] === "Germany"
  );
  
  if (hasGermanyAtOrgLevel) {
    // If org-level Germany, all projects count (current behavior)
    return allProjects.length;
  }
  
  // Otherwise, only count projects with Germany agencies
  return allProjects.filter(project =>
    (project.agencies || []).some(
      a => a.fields?.["Country Name"] === "Germany"
    )
  ).length;
}

// Function to count projects with specific Germany agencies
function countProjectsWithAgencies(org, selectedAgencies) {
  const allProjects = org.projects || [];
  
  // Check org-level agencies
  const orgAgencies = org.agencies || [];
  const orgGermanyAgencies = orgAgencies
    .filter(a => a.fields?.["Country Name"] === "Germany")
    .map(a => a.fields?.["Agency/Department Name"])
    .filter(Boolean);
  
  const orgHasSelectedAgency = orgGermanyAgencies.some(
    a => selectedAgencies.includes(a)
  );
  
  if (orgHasSelectedAgency) {
    // Org has selected agency at org-level, show all projects
    return allProjects.length;
  }
  
  // Check each project individually
  return allProjects.filter(project => {
    const projectAgencies = project.agencies || [];
    const projectGermanyAgencies = projectAgencies
      .filter(a => a.fields?.["Country Name"] === "Germany")
      .map(a => a.fields?.["Agency/Department Name"])
      .filter(Boolean);
    
    return projectGermanyAgencies.some(a => selectedAgencies.includes(a));
  }).length;
}

// Test 1: Germany alone
const germanyOrgs = orgsData.filter(isFundedByGermany);
const germanyProjectsTotal = germanyOrgs.reduce((sum, org) => 
  sum + countGermanyProjects(org), 0
);

console.log('\n📊 Test 1: Germany Alone');
console.log(`  Organizations: ${germanyOrgs.length}`);
console.log(`  Total Projects: ${germanyProjectsTotal}`);

// Test 2: Germany + ALL agencies (old behavior - restrictive)
const germanyOrgsWithAllAgencies = germanyOrgs.filter(org => {
  const totalProjects = countProjectsWithAgencies(org, germanyAgencies);
  return totalProjects > 0;
});
const germanyProjectsWithAllAgencies = germanyOrgsWithAllAgencies.reduce(
  (sum, org) => sum + countProjectsWithAgencies(org, germanyAgencies), 0
);

console.log('\n📊 Test 2: Germany + ALL Agencies (Current Logic)');
console.log(`  Organizations: ${germanyOrgsWithAllAgencies.length}`);
console.log(`  Total Projects: ${germanyProjectsWithAllAgencies}`);

// Identify discrepancy
const missingOrgs = germanyOrgs.filter(
  org => !germanyOrgsWithAllAgencies.includes(org)
);
const projectDiff = germanyProjectsTotal - germanyProjectsWithAllAgencies;

if (missingOrgs.length > 0 || projectDiff > 0) {
  console.log('\n⚠️  DISCREPANCY FOUND:');
  console.log(`  Missing Organizations: ${missingOrgs.length}`);
  console.log(`  Missing Projects: ${projectDiff}`);
  
  if (missingOrgs.length > 0) {
    console.log('\n  Missing Organizations Details:');
    missingOrgs.forEach(org => {
      const orgName = org.name || org.fields?.["Org Full Name"] || 'Unknown';
      const totalProjects = countGermanyProjects(org);
      const matchingProjects = countProjectsWithAgencies(org, germanyAgencies);
      console.log(`    - ${orgName}`);
      console.log(`      Total projects (Germany): ${totalProjects}`);
      console.log(`      Projects with selected agencies: ${matchingProjects}`);
    });
  }
  
  console.log('\n✅ FIX: Detect when ALL agencies are selected and treat as no filter');
  console.log('   Expected after fix:');
  console.log(`   Organizations: ${germanyOrgs.length} (same as Germany alone)`);
  console.log(`   Projects: ${germanyProjectsTotal} (same as Germany alone)`);
} else {
  console.log('\n✅ NO DISCREPANCY - Filter working correctly!');
}

console.log('\n');
