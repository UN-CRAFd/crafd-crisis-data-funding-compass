import labels from "@/config/labels.json";

// Map label keys to compact slugs (customize as desired)
const typeKeyToSlug: Record<string, string> = {
  data: "datasets",
  infrastructure: "infra",
  analytics: "analytics",
  human: "human",
  standards: "standards",
  learning: "learning",
};

const slugToTypeKey: Record<string, string> = Object.fromEntries(
  Object.entries(typeKeyToSlug).map(([k, v]) => [v, k]),
);

/**
 * Convert a compact slug (from URL) to the full display label used in the app.
 * Falls back to the original string if no mapping found.
 */
export function typeSlugToLabel(slug: string): string {
  const key = slugToTypeKey[slug];
  return key ? (labels.investmentTypes as Record<string, string>)[key] : slug;
}

/**
 * Convert a full display label (from app state) to a compact slug for URLs.
 * Falls back to a URL-safe version of the label if no mapping exists.
 */
export function typeLabelToSlug(labelOrKey: string): string {
  if (!labelOrKey) return labelOrKey;
  // If input is already a key in labels, prefer mapping
  if (Object.prototype.hasOwnProperty.call(typeKeyToSlug, labelOrKey)) {
    return typeKeyToSlug[labelOrKey];
  }

  // Try to find the key by matching display label
  const foundKey = Object.keys(labels.investmentTypes).find(
    (k) =>
      (labels.investmentTypes as Record<string, string>)[k].toLowerCase() ===
      labelOrKey.toLowerCase(),
  );
  if (foundKey && typeKeyToSlug[foundKey]) return typeKeyToSlug[foundKey];

  // As a fallback, produce a simple slug from the label string
  return labelOrKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const urlShortcuts = {
  typeSlugToLabel,
  typeLabelToSlug,
};

// Generic URL slug helpers - lowercase with dashes
// Used for org names, project keys, donor countries, etc.
// Handles special characters like apostrophes, parentheses, etc.
export const toUrlSlug = (str: string) =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Fold accents (ü → u)
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars except spaces and dashes
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes

export const fromUrlSlug = (slug: string) => slug.replace(/-/g, " ");

// Compare a URL slug against an original value (case-insensitive, handles special chars)
export const matchesUrlSlug = (urlSlug: string, original: string) => {
  if (!urlSlug || !original) return false;
  return toUrlSlug(original) === urlSlug.toLowerCase();
};

export default urlShortcuts;
