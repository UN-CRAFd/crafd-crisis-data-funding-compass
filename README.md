# CRISIS DATA FUNDING COMPASS v2

A Next.js data dashboard for displaying and analyzing Airtable ecosystem data. Built with React, TypeScript, Tailwind CSS v4, and shadcn/ui components.

## Features

- **Real-time Dashboard**: Displays live data from Airtable ecosystem
- **Interactive Analytics**: Project types, organization types, and funding statistics
- **Filtering System**: Real-time filtering by donor countries and investment types
- **Organization Explorer**: Expandable table showing organizations with their projects
- **Project Details**: Slide-in modal with comprehensive project information
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Modern Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4
- **Component Library**: Pre-built components using shadcn/ui
- **Static Export**: Ready for deployment to GitHub Pages or any static host

## Dev & Deploy

1. **Install Dependencies**  
   Run the following command to install all required dependencies:

   ```bash
   npm install
   ```

2. **Run Development Server**  
   Start the development server with:

   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`.

3. **Build for Production**  
   To create a production build, use:
   ```bash
   npm run build
   ```

## Getting Started

1. **Clone repository** and install dependencies
2. **Configure Airtable** by setting up your `.env.local` file with Airtable credentials
3. **Fetch Data** using `node scripts/fetch-airtable.js` to populate `public/data/ecosystem-table.json`
4. **Customize styling** in `src/app/globals.css` to match your brand colors
5. **Deploy** to GitHub Pages or any static hosting service

## Data Structure

Crisis data is stored in `public/data/ecosystem-table.json` fetched from Airtable. Each record contains:
- **Organization Info**: Provider organization names, types, donor countries
- **Project Details**: Names, descriptions, websites, funding status
- **Investment Data**: Types, themes, budgets, donor countries
- **Metadata**: Creation dates, IDs, status

Data processing logic is in `src/lib/data.ts` with TypeScript interfaces for type safety.

## Maintenance

- `npx shadcn --version`
- `npx next --version`
- `npx tsc --noEmit`
- `npm run lint`
- `npx eslint . --ext .js,.jsx,.ts,.tsx`
- `npm run format`
