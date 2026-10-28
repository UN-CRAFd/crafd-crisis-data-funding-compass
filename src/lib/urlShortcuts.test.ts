import labels from "@/config/labels.json";
import { describe, expect, it } from "vitest";
import {
  matchesUrlSlug,
  toUrlSlug,
  typeLabelToSlug,
  typeSlugToLabel,
} from "./urlShortcuts";

// Shared links carry these slugs, so changing one breaks links already out there.
const PUBLISHED_TYPE_SLUGS: Record<string, string> = {
  datasets: labels.investmentTypes.data,
  infra: labels.investmentTypes.infrastructure,
  analytics: labels.investmentTypes.analytics,
  human: labels.investmentTypes.human,
  standards: labels.investmentTypes.standards,
  learning: labels.investmentTypes.learning,
};

describe("investment type slugs", () => {
  it.each(Object.values(labels.investmentTypes))(
    "round-trips %s through a dedicated short slug",
    (label) => {
      const slug = typeLabelToSlug(label);
      expect(Object.keys(PUBLISHED_TYPE_SLUGS)).toContain(slug);
      expect(typeSlugToLabel(slug)).toBe(label);
    },
  );

  it.each(Object.entries(PUBLISHED_TYPE_SLUGS))(
    "resolves published slug %s",
    (slug, label) => {
      expect(typeSlugToLabel(slug)).toBe(label);
    },
  );

  it("accepts label keys, full labels in any case, and encoded labels", () => {
    const label = labels.investmentTypes.data;
    expect(typeSlugToLabel("data")).toBe(label);
    expect(typeSlugToLabel(label.toUpperCase())).toBe(label);
    expect(typeSlugToLabel(encodeURIComponent(label))).toBe(label);
    expect(typeLabelToSlug("data")).toBe("datasets");
  });

  it("passes unknown values through", () => {
    expect(typeSlugToLabel("unknown-type")).toBe("unknown-type");
    expect(typeLabelToSlug("Some New Type")).toBe("some-new-type");
  });
});

describe("toUrlSlug / matchesUrlSlug", () => {
  it("drops apostrophes, punctuation and extra dashes", () => {
    expect(toUrlSlug("Côte d'Ivoire")).toBe("cte-divoire");
    expect(toUrlSlug("  UN OCHA (Centre) -- HDX ")).toBe("un-ocha-centre-hdx");
  });

  it("matches a slug against the original value case-insensitively", () => {
    expect(matchesUrlSlug("UN-OCHA-Centre", "UN OCHA (Centre)")).toBe(true);
    expect(matchesUrlSlug("un-ocha", "UN OCHA (Centre)")).toBe(false);
    expect(matchesUrlSlug("", "anything")).toBe(false);
  });
});
