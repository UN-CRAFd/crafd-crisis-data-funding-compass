# TODO

## Airtable data

Most of these appear as warnings on each run of the nightly "Fetch Data from Airtable" workflow. Record IDs open directly in Airtable.

### Broken on the site

- [ ] Replace the local `file:///D:/Downloads/…` links in **Link to Budget Source** with public URLs. Every visitor currently gets a broken link.
  - Netherlands Red Cross (`rec4rSsPP59Beed9i`)
  - DRC: Danish Refugee Council (`recMRdDWNDoa8PFIn`)
  - The Pacific Community (`recodAuism4k7Osi8`)
- [ ] Link these projects to a provider organization (**Provided Data Ecosystem Projects**), or delete them if they're unfinished. Right now they don't appear anywhere on the site. Most also lack a `product_key` and themes.
  - IOM Displacement Tracking Matrix (`rec0MWjIwSud17zjp`)
  - IPC Integrated Food Security Phase Classification (`rec1o89vDfJDmuy8T`)
  - QGIS (`rec2Su6C7bHl4BC7h`)
  - EM-DAT Emergency Events Database (`recO4BLFg49cJm7Cp`)
  - Humanitarian OpenStreetMap (`recXwfWTo1LKOA5Ym`)
  - IGAD Drought Disaster Resilience and Sustainability Initiative (`rec6uqB0VKFRTigqD`)
  - IGAD Climate Prediction and Applications Centre (`recPWNqSfW4TjyPWF`)
  - IGAD Conflict Early Warning and Response Mechanism (`recnpprg98Gt8GaR2`)

### Incomplete records

- [ ] Add a `product_key` and themes to the projects that lack them. They are mostly the ones listed above, plus INSO Incident-reporting App (`rec0gyodfAiO7U9WZ`), NGO Incidents Overview (`recEVJE7YDp2PMJ76`), Country Safety Reporting (`recJoNN6T8DbDDqQN`), Conflict & Humanitarian Data Centre (`recIc1tzvx6kNOl24`) and Hazard Data (`recC9ouDgrs96Lse5`, which has no themes).
- [ ] Set an **Org Type** for SERVIR Global Collaborative (`rec1rqr5qfmpLzmJv`). Without one, it's missing from the org-type chart.
- [ ] Set an **Org HQ Country** for SERVIR (`rec1rqr5qfmpLzmJv`), FHN (`rec5SbkybILGgwGal`), MapSwipe (`recJUyRNHPNV6wRXI`) and PANDA (`recSqPg3XJM8pnI25`).
- [ ] Decide what to do with START Network (`recn63zsBJ27ZAG53`) and UNESCAP (`recttyRv8Su0gEX45`), which have no projects: link projects or remove them.
- [ ] Add **Org Donor Agencies** for these organizations, which have no funder, or confirm that none is known:
  - FEWS NET (`recHPSF1rhFJKTJJY`), Fields Data (`recIeY5Kyx0oDYcLA`), HERA (`reczDVCg6JFw8gHxR`), MapSwipe (`recJUyRNHPNV6wRXI`), SERVIR (`rec1rqr5qfmpLzmJv`) and World Bank Group (`recl51I0rcqfCzesL`)
  - OCHA: Centre for Humanitarian Data (`recAnhKXwgDyHOp8y`), even though its **Funding Type** is Voluntary
  - ITU (`recn29tiNyQceNhN6`) and UNESCAP (`recttyRv8Su0gEX45`). They are `Core`, so they show funders only when the dashboard is filtered by a member state.
- [ ] Link these agencies to what they fund, or remove them. They have no funding links, so they never appear on the site.
  - FNRS (Belgium, `rec4K8WmVji37YMCr`), THW (Germany, `recLZauHkiDI0nwAy`), OPW (Ireland, `recKqqMmG0fzm1WSr`), ISTAT (Italy, `rec1qQDNbg7E8mqD3`) and Fund for Development (Qatar, `recnzDLPx803fXQqf`)
  - Tableau Foundation (`recdfJ8kc29BrRxi8`), Geneva International Centre for Humanitarian Demining (`recLWqEZrThg4Drwo`), IFAD (`recvvJF6VEfKjphtY`), UNFPA (`rec7AphhRvNQfntpA`) and German Red Cross (`recYMaEogEDwsfBG7`)
  - Action Against Hunger (`reciQBMKhngwpZwbU`), Global Nutrition Cluster (`rec4XXzzXi0jHT1Fv`), Oxfam (`recvWXGo3NuHLKMUq`) and Save the Children (`recdtoV4UFwh3YJXi`)
- [ ] Fill in **ISO alpha-3** for every new country added to **Donors [High-level]**. Leave it empty for groups of funders and sub-national donors. Countries without a code get no flag and aren't matched to UN member states.
- [ ] Replace or remove the six "Unspecified Agency" placeholders, which fund nothing. They belong to Bulgaria (`recv4vpcDjXJM69YS`), Croatia (`recF2yzhW3jQCPdAt`), Georgia (`recsVZH4EnaUp9rJt`), Panama (`rectFh51oqrsA5MNt`), Private Firms (`recpoSWjCWxlFL5FM`) and Scotland (`recbtCkeJk3QthFZj`). Scotland's only agency is its placeholder, so the data lists Scotland as a donor with no funding.
- [ ] Complete the budget data:
  - Add a **Budget Source** for Arab Barometer (`reccGyY6Ep2ptBPKy`), DHS (`recU1jAnjfLIhxtwj`), ITU (`recn29tiNyQceNhN6`), Latinobarómetro (`recnt0uuGwuTUCjCw`) and the Pacific Community (`recodAuism4k7Osi8`). Each has a budget but no source.
  - Update HeiGIT's budget (`rec1UYGdN0XUBCmDY`), which dates from 2016.
  - Record the currency. Nothing says which currency **Est. Org Budget** is in. Either add a field, or state the convention (e.g. USD) on the methodology page.
- [ ] Define what an empty **Funding Type** means. 67 of 92 organizations have none, so it's unclear whether empty means "not Core" or "unknown".

### Cleanup (no visible effect)

- Rename to programme_budget_link. Clear name, consistent with budget_source_link. Merge, deploy, then run the pipeline straight away. The site errors for the few minutes in between, unless you trigger the pipeline right after the deploy finishes.
- [ ] The **Investment Theme(s)** field on Themes is an outdated single-select. Projects' **Investment Theme(s)** looks it up, so it shows old names such as "PiN Calculation" and "Displacement & Migration Analytics". Either repoint the lookup to **Investment Themes [Text Key]** or remove it. The import no longer reads this field.
- [ ] **Org Short Name** "Pacific Disaster Center " has a trailing space in the select option. The import trims it.

## Code

- [ ] Separate countries from other donors. Donors are derived from agencies' "Country Name", so `countries` and `donors` mix countries with funder groups (European Union, Foundations, United Nations, CRAF'd, …) and one sub-national government (Scotland). `countries.iso_alpha3` is empty for all non-countries, but groups and sub-national donors can't be told apart. Add a donor type (country, group, sub-national) in Donors [High-level].
- [ ] Fill in the **Export Date** in `docs/FULL_DATASET_README.md` whenever a full export goes out, ideally automatically. It is currently blank, so exports are undated.

## Methodology questions

- [ ] Clarify how organization-level and project-level funding relate. Of the 209 project funding links, 91 come from an agency that isn't linked to any of the project's provider organizations, so project funding isn't a subset of organization funding. Say on the methodology page whether this is intended, and how a donor that funds only a project is counted.
- [ ] State on the methodology page that general contributions are an assumption: every selected member state is shown as funding every Core organization equally, although assessed contributions scale with the UN scale of assessments.
- [ ] Consider making generic project names unique, since the site shows them identically:
  - "Admin Boundaries" is used by WFP (`admin-b`) and UNICEF (`admin-b2`).
  - "Information Management Services" is used by iMMAP and 3iS.
  - "Monitoring & Evaluation" is used by PANDA and 3iS.
