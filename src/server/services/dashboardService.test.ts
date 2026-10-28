import labels from "@/config/labels.json";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CoreData } from "../cache";
import { getCoreData } from "../cache";
import type { OrganizationDTO } from "../dto";
import type { OrgRow } from "../repositories";
import { processDashboardData } from "./dashboardService";

vi.mock("../cache", () => ({ getCoreData: vi.fn() }));

const DATA = labels.investmentTypes.data;
const ANALYTICS = labels.investmentTypes.analytics;

function org(id: string, overrides: Partial<OrgRow> = {}): OrgRow {
  return {
    id,
    org_key: id,
    full_name: null,
    short_name: null,
    website: null,
    description: null,
    estimated_budget: null,
    programme_budget: null,
    budget_source: null,
    budget_source_link: null,
    hdx_org_key: null,
    iati_org_key: null,
    mptfo_name: null,
    mptfo_url: null,
    transparency_portal_url: null,
    data_products_overview_url: null,
    funding_type: null,
    last_updated: null,
    org_type: null,
    hq_country: null,
    ...overrides,
  };
}

function project(orgId: string, projectId: string, name: string) {
  return {
    org_id: orgId,
    project_id: projectId,
    product_key: projectId,
    project_name: name,
    project_description: null,
    project_website: null,
    hdx_sohd: null,
  };
}

function agency(country: string, name: string) {
  return {
    agency_id: `${country}-${name}`,
    agency_name: name,
    agency_website: null,
    country_name: country,
  };
}

function theme(projectId: string, name: string, type: string) {
  return {
    project_id: projectId,
    theme_name: name,
    theme_key: name.toLowerCase(),
    theme_desc: null,
    type_name: type,
  };
}

/**
 * alpha:  org-level donor Germany (GIZ); projects flood (Germany/BMZ, UK) and survey (Germany/GIZ)
 * beta:   core-funded, no org-level donors; project warning (Norway)
 * gamma:  no donors at all; project commons with no themes
 */
const core: CoreData = {
  orgs: [
    org("alpha", { full_name: "Alpha Org", org_type: "NGO" }),
    org("beta", {
      full_name: "Beta Institute",
      org_type: "UN Agency",
      funding_type: "Core",
    }),
    org("gamma", { full_name: "Gamma Labs", org_type: "Private" }),
  ],
  orgAgencies: [{ org_id: "alpha", ...agency("Germany", "GIZ") }],
  orgProjects: [
    project("alpha", "flood", "Flood Mapping"),
    project("alpha", "survey", "Survey Toolkit"),
    project("beta", "warning", "Early Warning Hub"),
    project("gamma", "commons", "Data Commons"),
  ],
  projectThemes: [
    theme("flood", "Geospatial", DATA),
    theme("survey", "Surveys", ANALYTICS),
    theme("warning", "Geospatial", DATA),
  ],
  projectAgencies: [
    { project_id: "flood", ...agency("Germany", "BMZ") },
    { project_id: "flood", ...agency("United Kingdom", "FCDO") },
    { project_id: "survey", ...agency("Germany", "GIZ") },
    { project_id: "warning", ...agency("Norway", "NORAD") },
  ],
  agencies: [
    agency("Germany", "BMZ"),
    agency("Germany", "GIZ"),
    agency("United Kingdom", "FCDO"),
    agency("Norway", "NORAD"),
  ],
  themes: [
    {
      id: "t1",
      name: "Geospatial",
      theme_key: "geospatial",
      type_name: DATA,
      description: null,
    },
    {
      id: "t2",
      name: "Surveys",
      theme_key: "surveys",
      type_name: ANALYTICS,
      description: null,
    },
  ],
  memberStates: ["Sweden"],
};

beforeEach(() => {
  vi.mocked(getCoreData).mockResolvedValue(core);
});

const names = (orgs: OrganizationDTO[]) => orgs.map((o) => o.organizationName);
const projectNames = (o: OrganizationDTO) =>
  o.projects.map((p) => p.projectName);
const find = (orgs: OrganizationDTO[], name: string) =>
  orgs.find((o) => o.organizationName === name)!;

describe("assembly (no filters)", () => {
  it("returns every organization with its projects", async () => {
    const result = await processDashboardData();
    expect(names(result.organizationsWithProjects)).toEqual([
      "Alpha Org",
      "Beta Institute",
      "Gamma Labs",
    ]);
    expect(result.stats).toMatchObject({ dataProviders: 3, dataProjects: 4 });
  });

  it("splits org-level and project-level donors", async () => {
    const { allOrganizations } = await processDashboardData();
    const alpha = find(allOrganizations, "Alpha Org");

    expect(alpha.donorCountries).toEqual(["Germany"]);
    expect(alpha.donorInfo).toEqual([
      { country: "Germany", isOrgLevel: true },
      { country: "United Kingdom", isOrgLevel: false },
    ]);
    expect(alpha.orgAgencies).toEqual({ Germany: ["GIZ"] });

    const flood = alpha.projects.find((p) => p.id === "flood")!;
    expect(flood.donorCountries).toEqual(["Germany", "United Kingdom"]);
    expect(flood.donorAgencies).toEqual({
      Germany: ["BMZ"],
      "United Kingdom": ["FCDO"],
    });
    expect(flood.investmentTypes).toEqual([DATA]);
    expect(flood.investmentThemes).toEqual(["Geospatial"]);
  });

  it("rebuilds the legacy Airtable fields the frontend reads", async () => {
    const { allOrganizations } = await processDashboardData();
    const beta = find(allOrganizations, "Beta Institute");
    expect(beta.fields).toMatchObject({
      "Org Full Name": "Beta Institute",
      "Org Type": "UN Agency",
      "Funding Type": "Core",
      "Provided Data Ecosystem Projects": ["warning"],
    });
  });

  it("counts projects per investment type, including types with none", async () => {
    const { projectTypes } = await processDashboardData();
    const counts = Object.fromEntries(
      projectTypes.map((t) => [t.name, t.count]),
    );
    expect(counts[DATA]).toBe(2);
    expect(counts[ANALYTICS]).toBe(1);
    for (const label of Object.values(labels.investmentTypes)) {
      expect(counts).toHaveProperty([label]);
    }
  });

  it("groups theme filter options by investment type", async () => {
    const result = await processDashboardData();
    expect(result.investmentThemes).toEqual(["Geospatial", "Surveys"]);
    expect(result.investmentThemesByType).toEqual({
      [DATA]: ["Geospatial"],
      [ANALYTICS]: ["Surveys"],
    });
  });
});

describe("donor filter", () => {
  it("keeps all projects of an org that has the donor at org level", async () => {
    const result = await processDashboardData({ donorCountries: ["Germany"] });
    expect(names(result.organizationsWithProjects)).toEqual(["Alpha Org"]);
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Flood Mapping",
      "Survey Toolkit",
    ]);
  });

  // Current behavior: the org check uses donorInfo, which includes project-level
  // donors, so a donor of any one project shows all of the org's projects
  // (Survey Toolkit has no UK funding). Update this test if that is changed.
  it("keeps all projects when the donor funds any project of the org", async () => {
    const result = await processDashboardData({
      donorCountries: ["United Kingdom"],
    });
    expect(names(result.organizationsWithProjects)).toEqual(["Alpha Org"]);
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Flood Mapping",
      "Survey Toolkit",
    ]);
  });

  it("requires every selected donor (AND, not OR)", async () => {
    const both = await processDashboardData({
      donorCountries: ["Germany", "United Kingdom"],
    });
    expect(names(both.organizationsWithProjects)).toEqual(["Alpha Org"]);

    const none = await processDashboardData({
      donorCountries: ["Norway", "United Kingdom"],
    });
    expect(none.organizationsWithProjects).toEqual([]);
  });

  it("excludes selected donors from the co-financing chart", async () => {
    const result = await processDashboardData({ donorCountries: ["Germany"] });
    expect(result.topDonors.map((d) => d.name)).not.toContain("Germany");
  });
});

describe("agency filter", () => {
  it("narrows to projects funded by the selected agency", async () => {
    const result = await processDashboardData({
      donorCountries: ["Germany"],
      donorAgencies: ["BMZ"],
    });
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Flood Mapping",
    ]);
  });

  it("is ignored when every agency of the donor is selected", async () => {
    const result = await processDashboardData({
      donorCountries: ["Germany"],
      donorAgencies: ["BMZ", "GIZ"],
    });
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Flood Mapping",
      "Survey Toolkit",
    ]);
  });
});

describe("type, theme and search filters", () => {
  it("filters projects by investment type", async () => {
    const result = await processDashboardData({ investmentTypes: [ANALYTICS] });
    expect(names(result.organizationsWithProjects)).toEqual(["Alpha Org"]);
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Survey Toolkit",
    ]);
  });

  it("filters projects by exact theme name, ignoring case", async () => {
    const result = await processDashboardData({
      investmentThemes: ["geospatial"],
    });
    expect(names(result.organizationsWithProjects)).toEqual([
      "Alpha Org",
      "Beta Institute",
    ]);
    expect(result.stats.dataProjects).toBe(2);
  });

  it("shows all projects of an org whose name matches the search", async () => {
    const result = await processDashboardData({ searchQuery: "  alpha " });
    expect(names(result.organizationsWithProjects)).toEqual(["Alpha Org"]);
    expect(result.organizationsWithProjects[0].projectCount).toBe(2);
  });

  it("shows only matching projects when the search hits a project name", async () => {
    const result = await processDashboardData({ searchQuery: "warning" });
    expect(names(result.organizationsWithProjects)).toEqual(["Beta Institute"]);
    expect(projectNames(result.organizationsWithProjects[0])).toEqual([
      "Early Warning Hub",
    ]);
  });

  it("hides project-level donors whose projects were filtered out", async () => {
    const result = await processDashboardData({ investmentTypes: [ANALYTICS] });
    expect(result.organizationsWithProjects[0].donorInfo).toEqual([
      { country: "Germany", isOrgLevel: true },
    ]);
  });
});

describe("member state general contributions", () => {
  it("adds a selected member state as donor of core-funded orgs", async () => {
    const result = await processDashboardData({ donorCountries: ["Sweden"] });
    expect(names(result.organizationsWithProjects)).toEqual(["Beta Institute"]);
    expect(result.organizationsWithProjects[0].donorCountries).toContain(
      "Sweden",
    );
  });

  it("does nothing when general contributions are switched off", async () => {
    const result = await processDashboardData({
      donorCountries: ["Sweden"],
      showGeneralContributions: false,
    });
    expect(result.organizationsWithProjects).toEqual([]);
  });
});
