# Labels Configuration

This file contains all user-facing text and labels for the Crisis Data Funding Compass dashboard.

## How to Update Labels

All text displayed in the dashboard can be updated by editing the `src/config/labels.json` file. You do **not** need to edit any code files to change text.

### File Location
```
src/config/labels.json
```

## Label Sections

### Header
- `title`: Main title of the dashboard ("Crisis Data")
- `subtitle`: Subtitle ("Funding Compass")
- `betaBadge`: Beta badge text
- `betaTooltip`: Tooltip text shown when hovering over beta badge
- `shareButton`: Share button text
- `shareButtonSuccess`: Share button text after successful copy

### Statistics Cards
- `dataProviders.title`: Title for organizations card
- `dataProviders.label`: Label below the number
- `dataProjects.title`: Title for projects card
- `dataProjects.label`: Label below the number
- `donorCountries.title`: Title for donor countries card
- `donorCountries.label`: Label below the number

### Filters
- `searchPlaceholder`: Placeholder text in search box
- `donorPlaceholder`: Placeholder for donor dropdown
- `typePlaceholder`: Placeholder for type dropdown

### Section Headers
- `organizationsAndProjects`: Header for the organizations table
- `projectCategories`: Header for project categories chart
- `organizationTypes`: Header for organization types chart

### Investment Types
These are the full names displayed in the dropdown and throughout the dashboard:
- `data`: "Data Sets & Commons"
- `infrastructure`: "Infrastructure & Platforms"
- `analytics`: "Crisis Analytics & Insights"
- `human`: "Human Capital & Knowledge"
- `standards`: "Standards & Coordination"
- `learning`: "Learning & Exchange"

### Project Details
- `donorCountries`: Label for project donor countries
- `investmentTypes`: Label for investment types
- `notSpecified`: Text shown when data is not available

### Filter Description
These are used to construct the dynamic description sentence:
- `showingAll`: Template for when no filters are active (use `{projects}` and `{organizations}` as placeholders)
- `showing`: "Showing"
- `funds`: "funds"
- `project`: "project" (singular)
- `projects`: "projects" (plural)
- `in`: "in"
- `relatingTo`: "relating to"

### Footer
- `dataGatheredBy`: "Data gathered by the"
- `organization`: "Complex Risk Analytics Fund (CRAF'd)"
- `copyright`: Copyright text (use `{year}` as placeholder for current year)

### Loading & Error States
- `loading.message`: Text shown while loading data
- `error.message`: Error message when data fails to load

## Example Updates

### Change the main title:
```json
"header": {
  "title": "Crisis Information",
  "subtitle": "Data Compass"
}
```

### Update the beta tooltip:
```json
"header": {
  "betaTooltip": "This dashboard is currently in testing phase"
}
```

### Translate to another language:
Simply translate all the text values in the JSON file while keeping the keys the same.

## Notes

- The file uses standard JSON format
- All values must be enclosed in double quotes
- Use `{placeholders}` where indicated for dynamic values
- After making changes, the dashboard will automatically use the new labels (no code changes needed)
- Make sure to maintain valid JSON syntax (commas, quotes, etc.)

## Validation

After editing, you can validate your JSON at: https://jsonlint.com/

Or run the development server to see changes immediately:
```bash
npm run dev
```
