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

### Cleanup (no visible effect)

- [ ] **Org Programme Budget** is a URL field in Airtable, but the import reads it as a number, so the database column is always empty.
  - Either turn it into a number field and fill it in, or treat it as a link in `python/01b_fetch_airtable_to_sql.py` and the schema.
  - The column appears in the data export.
- [ ] The **Investment Theme(s)** field on Themes is an outdated single-select. Projects' **Investment Theme(s)** looks it up, so it shows old names such as "PiN Calculation" and "Displacement & Migration Analytics". Either repoint the lookup to **Investment Themes [Text Key]** or remove it, then drop the name-matching fallback ("Source 2") in `build_project_themes`.
- [ ] **Org Short Name** "Pacific Disaster Center " has a trailing space in the select option. The import trims it.
- [ ] Possible duplicate agency: "International Development Research Centre (IDRC)" exists twice.

## Code

- [ ] Fix the 3 `no-unused-expressions` lint errors in `src/components/DonorTable.tsx` (lines 564, 596 and 696). They are ternaries used as statements; rewriting them as `if`/`else` makes `pnpm lint` pass.
- [ ] Make `src/app/api/member-states/route.ts` read from `getCoreData()` instead of calling the repository directly. `getCoreData()` already includes `memberStates`.
- [ ] Optionally, accept the old theme key `disararment` as an alias for `disarmament`, so links shared before the rename still match.
- [ ] Remove the unused `Any` import in `python/01b_fetch_airtable_to_sql.py`.
- [ ] Update `README.md`, `docs/IATI_INTEGRATION.md` and `python/README.md`. They still describe the old Airtable → JSON setup (`public/data/*.json`, `scripts/…`), npm and Next 15.

## Access

- [ ] `AIRTABLE_WRITE_API_KEY` (local `.env` only) has write access to the base. Revoke it at <https://airtable.com/create/tokens> when it's no longer needed, and never add it to CI. The nightly job uses the read-only `AIRTABLE_API_KEY`.
