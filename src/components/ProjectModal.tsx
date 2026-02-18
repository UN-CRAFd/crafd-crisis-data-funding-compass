"use client";

import { Building2, ExternalLink, Package, PackageOpen } from "lucide-react";
import type { OrganizationWithProjects, ProjectData } from "../lib/data";
import { getThemeToTypeMapping } from "../lib/data";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/tooltipDescriptions";
import labels from "@/config/labels.json";
import BaseModal, {
  ModalHeader,
  CountryBadge,
  ModalTooltip,
} from "./BaseModal";
import { useEffect, useState, useMemo } from "react";

interface ProjectModalProps {
  project: ProjectData | null;
  organizationName?: string;
  allOrganizations: OrganizationWithProjects[];
  loading: boolean;
  projectAgenciesMap?: Record<string, Record<string, string[]>>;
  onOpenOrganizationModal?: (orgKey: string) => void;
  onOpenProjectModal?: (projectKey: string) => void;
  onOpenDonorModal?: (country: string) => void;
  onTypeClick?: (type: string) => void;
  onThemeClick?: (theme: string) => void;
}

export default function ProjectModal({
  project,
  allOrganizations,
  loading,
  projectAgenciesMap = {},
  onOpenOrganizationModal,
  onOpenProjectModal,
  onOpenDonorModal,
  onTypeClick,
  onThemeClick,
}: ProjectModalProps) {
  const [themeToTypeMapping, setThemeToTypeMapping] = useState<
    Record<string, string>
  >({});
  const [themeDescriptions, setThemeDescriptions] = useState<
    Record<string, string>
  >({});
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  // Helper to check if two theme arrays have the exact same themes
  const haveSameThemes = (themes1: string[], themes2: string[]): boolean => {
    if (themes1.length !== themes2.length) return false;
    const sorted1 = [...themes1].sort();
    const sorted2 = [...themes2].sort();
    return sorted1.every((theme, index) => theme === sorted2[index]);
  };

  // Find projects with exact same theme combination
  const similarProjects = useMemo(() => {
    if (!project?.investmentThemes || project.investmentThemes.length === 0)
      return [];

    // Get all projects from allOrganizations
    const allProjects = allOrganizations.flatMap((org) => org.projects);

    // Filter for projects with exact same themes (excluding current project)
    const matches = allProjects.filter(
      (p) =>
        p.id !== project.id &&
        p.investmentThemes &&
        p.investmentThemes.length > 0 &&
        haveSameThemes(p.investmentThemes, project.investmentThemes || []),
    );

    // Deduplicate by project id (since a project may appear in multiple orgs)
    const uniqueProjects = Array.from(
      new Map(matches.map((p) => [p.id, p])).values(),
    );

    return uniqueProjects;
  }, [project, allOrganizations]);

  // Load theme mapping and descriptions from API
  useEffect(() => {
    Promise.all([
      getThemeToTypeMapping(),
      fetch("/api/themes/descriptions").then((r) => r.ok ? r.json() : {}),
    ])
      .then(([themeToType, descs]) => {
        setThemeToTypeMapping(themeToType);
        setThemeDescriptions(descs);
      })
      .catch((error) => console.error("Error loading theme mapping:", error));
  }, []);

  const SubHeader = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-roboto mb-3 text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
      {children}
    </h3>
  );

  const renderHeader = ({
    showCopied,
    onShare,
    onClose,
  }: {
    showCopied: boolean;
    onShare: () => void;
    onClose: () => void;
  }) => {
    if (!project) {
      return (
        <ModalHeader
          icon={
            <Package className="h-6 w-6 shrink-0 text-[#333333] sm:h-7 sm:w-7" />
          }
          title={labels.modals.projectNotFound}
          showCopied={showCopied}
          onShare={onShare}
          onClose={onClose}
          loading={loading}
        />
      );
    }

    return (
      <ModalHeader
        icon={
          <Package className="h-6 w-6 shrink-0 text-[#333333] sm:h-7 sm:w-7" />
        }
        title={project.projectName}
        showCopied={showCopied}
        onShare={onShare}
        onClose={onClose}
        loading={loading}
      />
    );
  };

  const renderBody = ({
    tooltipContainer,
  }: {
    tooltipContainer?: Element | null;
  }): React.ReactNode => {
    if (loading) {
      return (
        <div className="space-y-4 p-4 sm:p-6">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
        </div>
      );
    }

    if (!project) {
      return (
        <div className="p-4 sm:p-6">
          <p className="text-gray-600">
            {labels.modals.projectNotFoundMessage}
          </p>
        </div>
      );
    }

    const supportingOrganizations = allOrganizations.filter((org) =>
      org.projects.some((p) => p.id === project.id),
    );

    const projectWebsite = project.projectWebsite || project.website || "";

    // Check if project is part of HDX Data Grid
    const isHdxDataGrid = project.hdxSohd && project.hdxSohd !== "None";

    return (
      <div className="font-roboto flex h-full flex-col px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
        {/* HDX Data Grid Badge */}
        {isHdxDataGrid && (
          <div className="mb-4">
            <a
              href="https://data.humdata.org/dashboards/overview-of-data-grids"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600"
            >
              <img
                src="/hdx_logo.png"
                alt="HDX logo"
                className="h-4 w-4 rounded-none"
              />
              <span>{labels.modals.hdxDataGrid}</span>
              <ExternalLink className="h-3 w-3 text-slate-600" />
            </a>
          </div>
        )}

        {project.projectDescription && (
          <p className="font-roboto mb-1 text-base leading-snug font-normal text-gray-700">
            {project.projectDescription}
            {projectWebsite && projectWebsite.trim() !== "" && (
              <>
                {" "}
                <a
                  href={projectWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {labels.modals.learnMore}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </p>
        )}

        {!project.projectDescription &&
          projectWebsite &&
          projectWebsite.trim() !== "" && (
            <div className="mb-6">
              <a
                href={projectWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "var(--brand-primary)",
                  color: "white",
                }}
              >
                {labels.modals.visitProjectWebsite}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

        <div className="mt-4 mb-6 border-t border-gray-200"></div>

        {supportingOrganizations.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                {labels.modals.providerOrganizations}
              </h3>
              <span className="text-lg font-normal text-gray-500 tabular-nums">
                ({supportingOrganizations.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {supportingOrganizations.map((org) => {
                // Always use orgShortName (org_key field)
                const orgKey = org.orgKey;

                return (
                  <button
                    key={org.id}
                    onClick={() => orgKey && onOpenOrganizationModal?.(orgKey)}
                    className="inline-flex w-full cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-left text-base font-medium transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--brand-bg-light)",
                      color: "var(--brand-primary-dark)",
                    }}
                  >
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    {org.organizationName}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {project.investmentTypes && project.investmentTypes.length > 0 && (
          <div className="mb-6">
            <SubHeader>{labels.modals.assetTypeAndTheme}</SubHeader>
            <div className="space-y-3">
              {project.investmentTypes.map((type, typeIndex) => {
                const IconComponent = getIconForInvestmentType(type);
                // Get themes that belong to this investment type
                const relatedThemes = (project.investmentThemes || []).filter(
                  (theme) => themeToTypeMapping[theme] === type,
                );

                return (
                  <div
                    key={typeIndex}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <ModalTooltip
                      content={
                        INVESTMENT_TYPE_DESCRIPTIONS[type] ||
                        labels.modals.clickToFilterByType
                      }
                      side="top"
                      tooltipContainer={tooltipContainer}
                    >
                      <button
                        onClick={() => onTypeClick?.(type)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: "var(--badge-other-bg)",
                          color: "var(--badge-other-text)",
                        }}
                      >
                        <IconComponent className="h-4 w-4" />
                        {type}
                      </button>
                    </ModalTooltip>
                    {relatedThemes.length > 0 && (
                      <>
                        {/* Connecting arc */}
                        <svg
                          width="16"
                          height="24"
                          viewBox="0 0 16 24"
                          className="shrink-0"
                          style={{ marginLeft: "-4px", marginRight: "-4px" }}
                        >
                          <path
                            d="M 2 12 Q 8 12, 14 12"
                            stroke="#6b6da8"
                            strokeWidth="1.5"
                            fill="none"
                            opacity="0.4"
                          />
                        </svg>
                        <div className="flex flex-wrap gap-2">
                          {relatedThemes.map((theme, themeIndex) => {
                            const description = themeDescriptions[theme];

                            const themeBadge = (
                              <button
                                key={themeIndex}
                                onClick={() => onThemeClick?.(theme)}
                                className="inline-flex cursor-pointer items-center rounded-md px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                                style={{
                                  backgroundColor: "#e9eaf9",
                                  color: "#6b6da8",
                                }}
                              >
                                {theme}
                              </button>
                            );

                            // Wrap in tooltip if description exists
                            if (description) {
                              return (
                                <ModalTooltip
                                  key={themeIndex}
                                  content={description}
                                  side="top"
                                  tooltipContainer={tooltipContainer}
                                >
                                  {themeBadge}
                                </ModalTooltip>
                              );
                            }

                            return themeBadge;
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
              {labels.modals.assetFunding}
            </h3>
            {project.donorCountries && project.donorCountries.length > 0 && (
              <span className="text-lg font-normal text-gray-500 tabular-nums">
                ({project.donorCountries.length})
              </span>
            )}
          </div>
          {project.donorCountries && project.donorCountries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.donorCountries.map((country, index) => {
                const projAgencies = projectAgenciesMap[project.id] || {};
                return (
                  <CountryBadge
                    key={index}
                    country={country}
                    onClick={onOpenDonorModal}
                    agencies={projAgencies[country]}
                    tooltipContainer={tooltipContainer}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500">
              {labels.modals.noAssetDonorInfo}
            </div>
          )}
        </div>

        {similarProjects.length > 0 && (
          <div className="mb-6 hidden">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                {labels.modals.similarProjects}
              </h3>
              <span className="text-lg font-normal text-slate-600 tabular-nums">
                ({similarProjects.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {similarProjects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => onOpenProjectModal?.(proj.productKey)}
                  onMouseEnter={() => setHoveredProjectId(proj.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-left text-base font-medium text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {hoveredProjectId === proj.id ? (
                    <PackageOpen className="h-4 w-4 shrink-0 text-slate-600" />
                  ) : (
                    <Package className="h-4 w-4 shrink-0 text-slate-600" />
                  )}
                  <span className="truncate">{proj.projectName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="min-h-8 grow"></div>

        <div className="mt-auto border-t border-gray-200 pt-4 pb-4">
          <div className="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
            {labels.modals.notes}
          </div>
          <div className="space-y-1 text-xs leading-snug text-gray-500">
            <div className="flex items-start">
              <span className="mr-2 shrink-0 text-gray-400"></span>
              <span>{labels.modals.notesInsights}</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2 shrink-0 text-gray-400"></span>
              <span>{labels.modals.notesProjectDonors}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={!!project}
      closeEventName="closeProjectModal"
      loading={loading}
      renderHeader={renderHeader}
      renderBody={renderBody}
    />
  );
}
