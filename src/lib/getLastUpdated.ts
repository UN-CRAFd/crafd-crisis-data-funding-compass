import { execSync } from "child_process";

/**
 * Get the last updated date from git repository
 * Returns a formatted date string like "February 4, 2025"
 * Falls back to build time if git is unavailable
 */
export function getLastUpdatedDate(): string {
  try {
    // Get the date of the most recent commit
    const timestamp = execSync(
      "git log -1 --format=%aI",
      { encoding: "utf-8" }
    ).trim();

    if (!timestamp) {
      return getFormattedDate(new Date());
    }

    const date = new Date(timestamp);
    return getFormattedDate(date);
  } catch (error) {
    // If git is unavailable or not in a git repo, return current date
    return getFormattedDate(new Date());
  }
}

/**
 * Format a date as "Month Day, Year"
 */
function getFormattedDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
}
