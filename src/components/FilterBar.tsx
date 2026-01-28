"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import labels from "@/config/labels.json";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import {
  ChevronDown,
  DatabaseBackup,
  DatabaseZap,
  Filter,
  Globe,
  RotateCcw,
  Search,
} from "lucide-react";
import { getMemberStates } from "@/lib/data";

interface FilterBarProps {
  // Search
  searchQuery: string;
  appliedSearchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;

  // Donors
  combinedDonors: string[];
  availableDonorCountries: string[];
  onDonorsChange: (values: string[]) => void;

  // Investment Types
  investmentTypes: string[];
  allKnownInvestmentTypes: string[];
  onTypesChange: (values: string[]) => void;

  // Investment Themes
  investmentThemes: string[];
  allKnownInvestmentThemes: string[];
  investmentThemesByType?: Record<string, string[]>;
  onThemesChange: (values: string[]) => void;

  // Project counts
  projectCountsByType?: Record<string, number>;
  projectCountsByTheme?: Record<string, number>;

  // Reset
  onResetFilters: () => void;

  // Filter description
  filterDescription?: React.ReactNode;

  // Optional styling
  className?: string;

  // Portal container for dropdowns (needed for fullscreen mode)
  portalContainer?: HTMLElement | null;

  // Fullscreen mode flag (adjusts layout for more filter space)
  isFullscreen?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  appliedSearchQuery,
  onSearchChange,
  onSearchSubmit,
  combinedDonors,
  availableDonorCountries,
  onDonorsChange,
  investmentTypes,
  allKnownInvestmentTypes,
  onTypesChange,
  investmentThemes,
  allKnownInvestmentThemes,
  investmentThemesByType = {},
  onThemesChange,
  projectCountsByType = {},
  projectCountsByTheme = {},
  onResetFilters,
  filterDescription,
  className = "",
  portalContainer = null,
  isFullscreen = false,
}) => {
  const [donorsMenuOpen, setDonorsMenuOpen] = useState(false);
  const [typesMenuOpen, setTypesMenuOpen] = useState(false);
  const [themesMenuOpen, setThemesMenuOpen] = useState(false);
  const [donorSearchQuery, setDonorSearchQuery] = useState<string>("");
  const [themeSearchQuery, setThemeSearchQuery] = useState<string>("");
  const [memberStates, setMemberStates] = useState<string[]>([]);

  // Load member states on mount
  useEffect(() => {
    getMemberStates().then((states) => setMemberStates(states));
  }, []);

  // Clear donor search when the selected donors change (so dropdown search resets)
  useEffect(() => {
    setDonorSearchQuery("");
  }, [combinedDonors]);

  // Combine available donors with selected member states to ensure they remain visible
  const allAvailableDonors = [
    ...new Set([
      ...availableDonorCountries,
      ...combinedDonors.filter((donor) => memberStates.includes(donor)),
    ]),
  ];

  // Filter donors based on search query
  const filteredAvailableDonors = allAvailableDonors.filter((donor) =>
    donor.toLowerCase().includes(donorSearchQuery.toLowerCase()),
  );

  // Show member states only when searching and no results found in actual donors
  const shouldShowMemberStates =
    donorSearchQuery.trim().length > 0 && filteredAvailableDonors.length === 0;
  const filteredMemberStates = shouldShowMemberStates
    ? memberStates.filter(
        (state) =>
          state.toLowerCase().includes(donorSearchQuery.toLowerCase()) &&
          !allAvailableDonors.includes(state),
      )
    : [];

  const allFilteredDonors = [
    ...filteredAvailableDonors,
    ...filteredMemberStates,
  ];

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* First Row: Search and Donors (equal width) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Modern Search Bar */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="search"
            type="text"
            placeholder={labels.filters.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearchSubmit();
              }
            }}
            className="h-10 w-full border-slate-200 bg-slate-50/50 pr-4 pl-10 font-normal transition-all hover:border-slate-300 hover:bg-white focus:border-[var(--brand-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)]/20"
          />
        </div>

        {/* Donor Countries Multi-Select */}
        <div className="min-w-0 flex-1">
          <DropdownMenu onOpenChange={(open) => setDonorsMenuOpen(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 w-full justify-between font-medium transition-all ${
                  combinedDonors.length > 0
                    ? "border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {combinedDonors.length === 0
                      ? labels.filters.donorPlaceholder
                      : combinedDonors.length === 1
                        ? combinedDonors[0]
                        : `${combinedDonors.length} ${labels.filterDescription.donors}`}
                  </span>
                </div>
                <ChevronDown
                  className={`ml-2 h-4 w-4 shrink-0 transform opacity-50 transition-transform ${
                    donorsMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto border border-slate-200 bg-white shadow-lg"
              onCloseAutoFocus={(e) => e.preventDefault()}
              container={portalContainer}
            >
              {/* Search Input */}
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder={labels.filters.donorSearchPlaceholder}
                    value={donorSearchQuery}
                    onChange={(e) => setDonorSearchQuery(e.target.value)}
                    className="h-7 border-slate-200 bg-slate-50 pl-7 text-xs focus:bg-white"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {combinedDonors.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)]">
                    <Filter className="h-3 w-3" />
                    {combinedDonors.length} {labels.filters.selected}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="max-h-[200px] overflow-y-auto">
                {allFilteredDonors.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    {labels.filters.noMatchingDonors}
                  </div>
                ) : (
                  allFilteredDonors.map((donor) => (
                    <DropdownMenuCheckboxItem
                      key={donor}
                      checked={combinedDonors.includes(donor)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Limit to maximum 16 donors
                          if (combinedDonors.length < 16) {
                            onDonorsChange(
                              Array.from(new Set([...combinedDonors, donor])),
                            );
                          }
                        } else {
                          onDonorsChange(
                            combinedDonors.filter((d) => d !== donor),
                          );
                        }
                      }}
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer"
                      disabled={
                        !combinedDonors.includes(donor) &&
                        combinedDonors.length >= 16
                      }
                    >
                      {donor}
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Second Row: Investment Types and Themes (equal width) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Investment Types Multi-Select */}
        <div className="min-w-0 flex-1">
          <DropdownMenu onOpenChange={(open) => setTypesMenuOpen(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 w-full justify-between font-medium transition-all ${
                  investmentTypes.length > 0
                    ? "border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <DatabaseBackup className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {investmentTypes.length === 0
                      ? labels.filters.typePlaceholder
                      : investmentTypes.length === 1
                        ? (() => {
                            const type = investmentTypes[0];
                            const typeKey = Object.keys(
                              labels.investmentTypes,
                            ).find(
                              (key) =>
                                labels.investmentTypes[
                                  key as keyof typeof labels.investmentTypes
                                ]
                                  .toLowerCase()
                                  .includes(type.toLowerCase()) ||
                                type.toLowerCase().includes(key.toLowerCase()),
                            );
                            return typeKey
                              ? labels.investmentTypes[
                                  typeKey as keyof typeof labels.investmentTypes
                                ]
                              : type;
                          })()
                        : `${investmentTypes.length} ${labels.filterDescription.types}`}
                  </span>
                </div>
                <ChevronDown
                  className={`ml-2 h-4 w-4 shrink-0 transform opacity-50 transition-transform ${
                    typesMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto border border-slate-200 bg-white shadow-lg"
              onCloseAutoFocus={(e) => e.preventDefault()}
              container={portalContainer}
            >
              {investmentTypes.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)]">
                    <Filter className="h-3 w-3" />
                    {investmentTypes.length} {labels.filters.selected}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {allKnownInvestmentTypes.map((type) => {
                const typeKey = Object.keys(labels.investmentTypes).find(
                  (key) =>
                    labels.investmentTypes[
                      key as keyof typeof labels.investmentTypes
                    ]
                      .toLowerCase()
                      .includes(type.toLowerCase()) ||
                    type.toLowerCase().includes(key.toLowerCase()),
                );
                const displayName = typeKey
                  ? labels.investmentTypes[
                      typeKey as keyof typeof labels.investmentTypes
                    ]
                  : type;

                const IconComponent = getIconForInvestmentType(displayName);

                const isChecked = investmentTypes.some(
                  (selected) =>
                    selected.toLowerCase().trim() === type.toLowerCase().trim(),
                );

                const projectCount =
                  projectCountsByType[type.toLowerCase().trim()] || 0;

                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const alreadyExists = investmentTypes.some(
                          (t) =>
                            t.toLowerCase().trim() ===
                            type.toLowerCase().trim(),
                        );
                        if (!alreadyExists) {
                          onTypesChange([...investmentTypes, type]);
                        }
                      } else {
                        onTypesChange(
                          investmentTypes.filter(
                            (t) =>
                              t.toLowerCase().trim() !==
                              type.toLowerCase().trim(),
                          ),
                        );
                      }
                    }}
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-1 items-center gap-2">
                      <IconComponent className="h-4 w-4" />
                      <span className="flex-1">{displayName}</span>
                      <span className="ml-auto text-xs text-slate-400">
                        ({projectCount})
                      </span>
                    </div>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Investment Themes Multi-Select */}
        <div className="min-w-0 flex-1">
          <DropdownMenu onOpenChange={(open) => setThemesMenuOpen(open)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`h-10 w-full justify-between font-medium transition-all ${
                  investmentThemes.length > 0
                    ? "border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]"
                    : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <DatabaseZap className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {investmentThemes.length === 0
                      ? labels.filters.themePlaceholder
                      : investmentThemes.length === 1
                        ? investmentThemes[0]
                        : `${investmentThemes.length} themes`}
                  </span>
                </div>
                <ChevronDown
                  className={`ml-2 h-4 w-4 shrink-0 transform opacity-50 transition-transform ${
                    themesMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={4}
              className="max-h-[300px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto border border-slate-200 bg-white shadow-lg"
              onCloseAutoFocus={(e) => e.preventDefault()}
              container={portalContainer}
            >
              {/* Search Input */}
              <div className="p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search themes..."
                    value={themeSearchQuery}
                    onChange={(e) => setThemeSearchQuery(e.target.value)}
                    className="h-7 border-slate-200 bg-slate-50 pl-7 text-xs focus:bg-white"
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              {investmentThemes.length > 0 && (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)]">
                    <Filter className="h-3 w-3" />
                    {investmentThemes.length} {labels.filters.selected}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}

              <div className="max-h-[200px] overflow-y-auto">
                {Object.keys(investmentThemesByType).length > 0
                  ? // Build a map of all themes with counts and their investment type categories
                    (() => {
                      const themesByCategory: Record<string, string[]> = {};

                      // For each theme that has a count, find which category it belongs to
                      Object.keys(projectCountsByTheme).forEach((themeKey) => {
                        const count = projectCountsByTheme[themeKey];
                        if (count > 0) {
                          // Find the original case-sensitive theme name
                          const originalTheme = allKnownInvestmentThemes.find(
                            (t) =>
                              t.toLowerCase().trim() ===
                              themeKey.toLowerCase().trim(),
                          );
                          if (originalTheme) {
                            // Find which investment type category this theme belongs to
                            for (const [
                              investmentType,
                              themes,
                            ] of Object.entries(investmentThemesByType)) {
                              if (
                                themes.some(
                                  (t) => t.toLowerCase().trim() === themeKey,
                                )
                              ) {
                                if (!themesByCategory[investmentType]) {
                                  themesByCategory[investmentType] = [];
                                }
                                themesByCategory[investmentType].push(
                                  originalTheme,
                                );
                                break;
                              }
                            }
                          }
                        }
                      });

                      // Render grouped themes - sort with selected types first
                      return Object.entries(themesByCategory)
                        .sort(([typeA], [typeB]) => {
                          const isTypeASelected = investmentTypes.some(
                            (t) =>
                              t.toLowerCase().trim() ===
                              typeA.toLowerCase().trim(),
                          );
                          const isTypeBSelected = investmentTypes.some(
                            (t) =>
                              t.toLowerCase().trim() ===
                              typeB.toLowerCase().trim(),
                          );

                          // Selected types come first
                          if (isTypeASelected && !isTypeBSelected) return -1;
                          if (!isTypeASelected && isTypeBSelected) return 1;

                          // Within selected types, maintain the order from investmentTypes
                          if (isTypeASelected && isTypeBSelected) {
                            const indexA = investmentTypes.findIndex(
                              (t) =>
                                t.toLowerCase().trim() ===
                                typeA.toLowerCase().trim(),
                            );
                            const indexB = investmentTypes.findIndex(
                              (t) =>
                                t.toLowerCase().trim() ===
                                typeB.toLowerCase().trim(),
                            );
                            return indexA - indexB;
                          }

                          // Unselected types sorted alphabetically
                          return typeA.localeCompare(typeB);
                        })
                        .map(([investmentType, themes]) => {
                          // Filter themes based on search query
                          const filteredThemes = themes.filter((theme) =>
                            theme
                              .toLowerCase()
                              .includes(themeSearchQuery.toLowerCase()),
                          );

                          if (filteredThemes.length === 0) return null;

                          const IconComponent =
                            getIconForInvestmentType(investmentType);

                          return (
                            <div key={investmentType}>
                              {/* Category Header */}
                              <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600">
                                <IconComponent className="h-3 w-3" />
                                {investmentType}
                              </div>
                              {/* Themes under this category */}
                              {filteredThemes.map((theme) => {
                                const isChecked = investmentThemes.some(
                                  (selected) =>
                                    selected.toLowerCase().trim() ===
                                    theme.toLowerCase().trim(),
                                );

                                const projectCount =
                                  projectCountsByTheme[
                                    theme.toLowerCase().trim()
                                  ] || 0;

                                return (
                                  <DropdownMenuCheckboxItem
                                    key={theme}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        const alreadyExists =
                                          investmentThemes.some(
                                            (t) =>
                                              t.toLowerCase().trim() ===
                                              theme.toLowerCase().trim(),
                                          );
                                        if (!alreadyExists) {
                                          onThemesChange([
                                            ...investmentThemes,
                                            theme,
                                          ]);
                                        }
                                      } else {
                                        onThemesChange(
                                          investmentThemes.filter(
                                            (t) =>
                                              t.toLowerCase().trim() !==
                                              theme.toLowerCase().trim(),
                                          ),
                                        );
                                      }
                                    }}
                                    onSelect={(e) => e.preventDefault()}
                                    className="cursor-pointer py-1 pl-6"
                                  >
                                    <div className="flex w-full flex-1 items-center gap-2">
                                      <span className="flex-1">{theme}</span>
                                      <span className="ml-auto text-xs text-slate-400">
                                        ({projectCount})
                                      </span>
                                    </div>
                                  </DropdownMenuCheckboxItem>
                                );
                              })}
                            </div>
                          );
                        });
                    })()
                  : // Fallback to flat list if grouped data not available
                    allKnownInvestmentThemes
                      .filter((theme) =>
                        theme
                          .toLowerCase()
                          .includes(themeSearchQuery.toLowerCase()),
                      )
                      .map((theme) => {
                        const isChecked = investmentThemes.some(
                          (selected) =>
                            selected.toLowerCase().trim() ===
                            theme.toLowerCase().trim(),
                        );

                        const projectCount =
                          projectCountsByTheme[theme.toLowerCase().trim()] || 0;

                        return (
                          <DropdownMenuCheckboxItem
                            key={theme}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const alreadyExists = investmentThemes.some(
                                  (t) =>
                                    t.toLowerCase().trim() ===
                                    theme.toLowerCase().trim(),
                                );
                                if (!alreadyExists) {
                                  onThemesChange([...investmentThemes, theme]);
                                }
                              } else {
                                onThemesChange(
                                  investmentThemes.filter(
                                    (t) =>
                                      t.toLowerCase().trim() !==
                                      theme.toLowerCase().trim(),
                                  ),
                                );
                              }
                            }}
                            onSelect={(e) => e.preventDefault()}
                            className="cursor-pointer py-1"
                          >
                            <div className="flex w-full flex-1 items-center gap-2">
                              <span className="flex-1">{theme}</span>
                              <span className="ml-auto text-xs text-slate-500">
                                ({projectCount})
                              </span>
                            </div>
                          </DropdownMenuCheckboxItem>
                        );
                      })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Description and Reset Button */}
      {filterDescription && (
        <div className="mt-2 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-600 sm:text-sm">
            {filterDescription}
          </p>
          {(combinedDonors.length > 0 ||
            investmentTypes.length > 0 ||
            investmentThemes.length > 0 ||
            appliedSearchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-7 border-slate-300 bg-slate-100 px-3 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-200"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          )}
        </div>
      )}

      {/* Reset Button Only (when no filterDescription) */}
      {!filterDescription &&
        (combinedDonors.length > 0 ||
          investmentTypes.length > 0 ||
          investmentThemes.length > 0 ||
          appliedSearchQuery) && (
          <div className="mt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="h-7 border-slate-300 bg-slate-100 px-3 text-xs text-slate-700 hover:border-slate-300 hover:bg-slate-200"
            >
              <RotateCcw className="mr-1.5 h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
    </div>
  );
};

export default FilterBar;
