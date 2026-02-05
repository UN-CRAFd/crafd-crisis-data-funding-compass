"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { forceCollide } from "d3-force";
import ForceGraph2D from "react-force-graph-2d";
import { Maximize, Minimize, Crosshair, Layers, Package, Building2, DollarSign, Type, Zap, GitBranch, ChevronLeft, ChevronRight } from "lucide-react";
import type { OrganizationWithProjects } from "../types/airtable";
import FilterBar from "./FilterBar";
import NoResultsModal from "./NoResultsModal";
import { Button } from "./ui/button";
import { getCountryFlagUrl } from "./CountryFlag";
import { getBrandColor, getBrandColors } from "@/lib/colorUtils";
import { useProjectCounts } from "@/hooks/useProjectCounts";

interface NetworkGraphProps {
  organizationsWithProjects: OrganizationWithProjects[];
  allOrganizations?: OrganizationWithProjects[]; // Unfiltered organizations for counting
  onOpenOrganizationModal: (orgKey: string) => void;
  onOpenProjectModal: (projectKey: string) => void;
  onOpenDonorModal?: (donorCountry: string) => void;
  selectedOrgKey?: string;
  selectedProjectKey?: string;
  // Filter props for fullscreen mode
  searchQuery?: string;
  appliedSearchQuery?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  combinedDonors?: string[];
  availableDonorCountries?: string[];
  onDonorsChange?: (values: string[]) => void;
  investmentTypes?: string[];
  allKnownInvestmentTypes?: string[];
  onTypesChange?: (values: string[]) => void;
  investmentThemes?: string[];
  allKnownInvestmentThemes?: string[];
  investmentThemesByType?: Record<string, string[]>;
  onThemesChange?: (values: string[]) => void;
  onResetFilters?: () => void;
  filterDescription?: React.ReactNode;
  orgAgenciesMap?: Record<string, Record<string, string[]>>; // Map of org ID -> country -> agencies
}

interface GraphNode {
  id: string;
  name: string;
  type: "donor" | "organization" | "project";
  value: number; // Size of the node
  color: string;
  orgKey?: string;
  orgShortName?: string; // Short name for organizations
  projectKey?: string;
  orgType?: string; // For organization clustering
  assetTypes?: string[]; // For project/asset clustering
  estimatedBudget?: number; // For funding-based scaling
  hasAgencies?: boolean; // For donors: whether they have any agencies
  x?: number;
  y?: number;
  fx?: number; // Fixed x position for clustering
  fy?: number; // Fixed y position for clustering
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  organizationsWithProjects,
  allOrganizations,
  onOpenOrganizationModal,
  onOpenProjectModal,
  onOpenDonorModal,
  selectedOrgKey,
  selectedProjectKey,
  // Filter props
  searchQuery = "",
  appliedSearchQuery = "",
  onSearchChange = () => {},
  onSearchSubmit = () => {},
  combinedDonors = [],
  availableDonorCountries = [],
  onDonorsChange = () => {},
  investmentTypes = [],
  allKnownInvestmentTypes = [],
  onTypesChange = () => {},
  investmentThemes = [],
  allKnownInvestmentThemes = [],
  investmentThemesByType = {},
  onThemesChange = () => {},
  onResetFilters = () => {},
  filterDescription,
  orgAgenciesMap = {},
}) => {
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverHighlightNodes, setHoverHighlightNodes] = useState<Set<string>>(
    new Set(),
  );
  const [hoverHighlightLinks, setHoverHighlightLinks] = useState<Set<string>>(
    new Set(),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const globalScaleRef = useRef<number>(1); // Track current zoom scale
  const [clusterByOrgType, setClusterByOrgType] = useState(false);
  const [clusterByAssetType, setClusterByAssetType] = useState(false);
  const [scalingMode, setScalingMode] = useState<
    "connections" | "funding" | null
  >(null);
  const [showAllNames, setShowAllNames] = useState(false);
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [settingsCollapsed, setSettingsCollapsed] = useState(false);
  const lastClusterStateRef = useRef<string>(""); // Track last clustering state to prevent unnecessary updates
  const [filterBarContainer, setFilterBarContainer] =
    useState<HTMLElement | null>(null);
  const lastFiltersRef = useRef<string>(""); // Track filter state to detect changes
  const lastOrgCountRef = useRef<number>(0); // Track organization count to detect graph refresh
  const [filterBarHeight, setFilterBarHeight] = useState<number>(0);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Cache for country flag images
  const flagImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, setFlagLoadCounter] = useState(0); // Counter to trigger re-render when flags load

  // Turn off clustering when filters change or graph refreshes
  useEffect(() => {
    const currentFilters = JSON.stringify({
      donors: combinedDonors,
      types: investmentTypes,
      themes: investmentThemes,
      search: appliedSearchQuery,
    });

    const currentOrgCount = organizationsWithProjects.length;

    // If filters have changed or organization count changed (graph refresh)
    if (
      lastFiltersRef.current &&
      (lastFiltersRef.current !== currentFilters ||
        lastOrgCountRef.current !== currentOrgCount)
    ) {
      setClusterByOrgType(false);
      setClusterByAssetType(false);
    }

    lastFiltersRef.current = currentFilters;
    lastOrgCountRef.current = currentOrgCount;
  }, [
    combinedDonors,
    investmentTypes,
    investmentThemes,
    appliedSearchQuery,
    organizationsWithProjects,
  ]);

  // Calculate project counts using shared hook
  const { projectCountsByType, projectCountsByTheme } = useProjectCounts({
    organizations: allOrganizations || organizationsWithProjects,
    combinedDonors: combinedDonors || [],
    appliedSearchQuery: appliedSearchQuery || "",
    investmentTypes: investmentTypes || [],
    investmentThemes: investmentThemes || [],
  });

  // Transform data into graph format - memoized with stable reference
  const graphData = React.useMemo<GraphData>(() => {
    const startTime = performance.now();

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const donorSet = new Set<string>();
    const projectSet = new Set<string>(); // Track unique projects to avoid duplicates

    // Calculate initial positions based on canvas center
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const spreadRadius = Math.min(dimensions.width, dimensions.height) * 0.3;

    // Collect all unique donors first
    organizationsWithProjects.forEach((org) => {
      org.donorCountries.forEach((donor) => donorSet.add(donor));
    });

    // Get brand colors from CSS variables (cached)
    const brandColors = getBrandColors();
    const brandPrimary = brandColors.brandPrimary;
    const brandBgLight = brandColors.brandPrimaryLight;
    const badgeOtherBg = brandColors.badgeOtherBg;
    const badgeSlateBg = brandColors.badgeSlateBg;
    const selectedDonorColor = "#94a3b8"; // Medium gray for filtered donors (slate-400)

    // Add donor nodes - largest, using slate colors (like in tables)
    // Arrange donors in a circle around the top of the canvas
    const donorArray = Array.from(donorSet);
    donorArray.forEach((donor, index) => {
      // Use darker color if this donor is in the filter
      const isFiltered =
        combinedDonors &&
        combinedDonors.length > 0 &&
        combinedDonors.includes(donor);

      // Check if this donor has any agencies across all organizations
      let hasAgencies = false;
      if (orgAgenciesMap) {
        for (const orgId in orgAgenciesMap) {
          const agenciesForOrg = orgAgenciesMap[orgId];
          if (
            agenciesForOrg &&
            agenciesForOrg[donor] &&
            agenciesForOrg[donor].length > 0
          ) {
            hasAgencies = true;
            break;
          }
        }
      }

      // Calculate initial position in an arc at the top
      const angle = (index / donorArray.length) * Math.PI - Math.PI / 2; // Arc from left to right at top
      const x = centerX + Math.cos(angle) * spreadRadius * 0.8;
      const y = centerY - spreadRadius * 0.6; // Position toward top

      nodes.push({
        id: `donor-${donor}`,
        name: donor,
        type: "donor",
        value: 25, // Larger nodes for donors
        color: isFiltered ? selectedDonorColor : badgeSlateBg, // Medium gray for filtered donors
        hasAgencies, // Flag whether this donor has agencies
        x,
        y,
      });
    });

    // Add organization and project nodes
    let orgIndex = 0;
    const totalOrgs = organizationsWithProjects.length;

    organizationsWithProjects.forEach((org) => {
      const orgNodeId = `org-${org.id}`;

      // Calculate initial position for organizations in a circle around center
      const angle = (orgIndex / totalOrgs) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * spreadRadius * 0.5;
      const y = centerY + Math.sin(angle) * spreadRadius * 0.5;

      // Add organization node - medium, using amber/golden badge color (like ACAPS badge)
      nodes.push({
        id: orgNodeId,
        name: org.organizationName,
        type: "organization",
        value: 22, // Medium nodes for organizations
        color: brandBgLight, // Uses --brand-bg-light (amber/golden from organization badges)
        orgKey: org.orgKey, // Use orgKey for modal/URL
        orgShortName: org.orgShortName, // Store short name for label display
        orgType: org.type, // Store org type for clustering
        estimatedBudget: org.estimatedBudget, // Store budget for funding-based scaling
        x,
        y,
      });

      orgIndex++;

      // Link organizations to donors
      org.donorCountries.forEach((donor) => {
        links.push({
          source: `donor-${donor}`,
          target: orgNodeId,
          value: 2,
        });
      });

      // Add project nodes and link to organizations - using purple/indigo badge color
      org.projects.forEach((project) => {
        const projectNodeId = `project-${project.id}`;

        // Only add the project node if we haven't seen it before
        if (!projectSet.has(projectNodeId)) {
          projectSet.add(projectNodeId);

          // Position projects near their organization with some random offset
          const offsetAngle = Math.random() * 2 * Math.PI;
          const offsetDist = 50 + Math.random() * 50;
          const px = x + Math.cos(offsetAngle) * offsetDist;
          const py = y + Math.sin(offsetAngle) * offsetDist;

          nodes.push({
            id: projectNodeId,
            name: project.projectName,
            type: "project",
            value: 20, // Slightly larger nodes for projects (assets)
            color: badgeOtherBg, // Uses --badge-other-bg (purple/indigo from asset type badges)
            projectKey: project.productKey, // Use productKey for modal/URL
            assetTypes: project.investmentTypes || [], // Store asset types for clustering
            x: px,
            y: py,
          });
        }

        // Always add the link from organization to project
        links.push({
          source: orgNodeId,
          target: projectNodeId,
          value: 1,
        });

        // Add visual connections between donors and projects (no attraction force)
        // Only add links for donors that exist in the donor nodes
        project.donorCountries?.forEach((donor) => {
          if (donorSet.has(donor)) {
            links.push({
              source: `donor-${donor}`,
              target: projectNodeId,
              value: 0, // Zero value means no attractive force
            });
          }
        });
      });
    });

    // Compute node degrees (number of incident links) to derive a relevance score
    const degreeMap = new Map<string, number>();
    nodes.forEach((n) => degreeMap.set(n.id, 0));
    links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? (link.source as any).id : link.source;
      const targetId =
        typeof link.target === "object" ? (link.target as any).id : link.target;
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
    });

    // Calculate max budget for normalization (only for orgs with budget data)
    const orgBudgets = nodes
      .filter(
        (n) =>
          n.type === "organization" &&
          n.estimatedBudget &&
          n.estimatedBudget > 0,
      )
      .map((n) => n.estimatedBudget!);
    const maxBudget = orgBudgets.length > 0 ? Math.max(...orgBudgets) : 1;
    const minBudget = orgBudgets.length > 0 ? Math.min(...orgBudgets) : 0;

    // Scale node visual size based on scalingMode
    // null/'standard' = fixed size by node type (donors biggest, orgs medium, assets smallest)
    // 'connections' = size by degree (number of links)
    // 'funding' = organizations sized by budget, others by connections
    const SIZE_SCALE = 6; // multiplier for the log-scaling term
    nodes.forEach((n) => {
      const deg = degreeMap.get(n.id) || 0;
      // Base sizes: donors start larger, then organizations, then projects/assets
      const base =
        n.type === "donor" ? 28 : n.type === "organization" ? 24 : 18;
      const minSize =
        n.type === "donor" ? 28 : n.type === "organization" ? 24 : 18;

      if (!scalingMode || scalingMode === null) {
        // Standard/default mode: fixed sizes based on node type
        // Donors: 40, Organizations: 30, Assets: 20
        n.value = n.type === "donor" ? 45 : n.type === "organization" ? 40 : 30;
      } else if (scalingMode === "funding" && n.type === "organization") {
        // For funding mode: scale organizations by their budget
        if (n.estimatedBudget && n.estimatedBudget > 0) {
          // Use log scale for budget to handle large range
          // Normalize to 0-1 range using log scale
          const logBudget = Math.log10(n.estimatedBudget);
          const logMin = minBudget > 0 ? Math.log10(minBudget) : 0;
          const logMax = Math.log10(maxBudget);
          const normalized =
            logMax > logMin ? (logBudget - logMin) / (logMax - logMin) : 0.5;
          // Scale from minSize to 70 based on normalized budget
          n.value = Math.round(minSize + normalized * (70 - minSize));
        } else {
          // No budget data - use minimum size
          n.value = minSize;
        }
      } else {
        // Connection-based scaling
        const scaled = Math.round(base + Math.log1p(deg) * SIZE_SCALE);
        // Clamp to reasonable bounds
        n.value = Math.min(80, Math.max(minSize, scaled));
      }
    });

    // Calculate average coordinates
    let sumX = 0;
    let sumY = 0;
    nodes.forEach((n) => {
      sumX += n.x || 0;
      sumY += n.y || 0;
    });
    const avgX = sumX / nodes.length;
    const avgY = sumY / nodes.length;

    // Find the most central node (highest degree)
    let maxDegree = 0;
    let mostCentralNode: GraphNode | null = null;

    nodes.forEach((n) => {
      const degree = degreeMap.get(n.id) || 0;
      if (degree > maxDegree) {
        maxDegree = degree;
        mostCentralNode = n;
      }
    });

    // Fix the most central node at the average coordinates to anchor the graph initially
    // Store the node ID to unfix it after 3 seconds
    if (mostCentralNode) {
      const centralNode = mostCentralNode as GraphNode;
      centralNode.fx = avgX;
      centralNode.fy = avgY;
      // Store metadata for later unfixing
      (centralNode as any).__initiallyFixed = true;
      (centralNode as any).__fixedNodeId = centralNode.id;
    }

    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[NetworkGraph] Graph data computed in ${(endTime - startTime).toFixed(2)}ms (${nodes.length} nodes, ${links.length} links)`,
      );
    }

    return { nodes, links };
  }, [organizationsWithProjects]); // scalingMode removed - handled in separate effect for smooth transitions

  // Smoothly update node sizes when scalingMode changes (without rebuilding the graph)
  useEffect(() => {
    if (graphData.nodes.length === 0) return;

    // Compute node degrees for connection-based scaling
    const degreeMap = new Map<string, number>();
    graphData.nodes.forEach((n) => degreeMap.set(n.id, 0));
    graphData.links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? (link.source as any).id : link.source;
      const targetId =
        typeof link.target === "object" ? (link.target as any).id : link.target;
      degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
    });

    // Calculate budget range for funding-based scaling
    const orgBudgets = graphData.nodes
      .filter(
        (n) =>
          n.type === "organization" &&
          n.estimatedBudget &&
          n.estimatedBudget > 0,
      )
      .map((n) => n.estimatedBudget!);
    const maxBudget = orgBudgets.length > 0 ? Math.max(...orgBudgets) : 1;
    const minBudget = orgBudgets.length > 0 ? Math.min(...orgBudgets) : 0;

    const SIZE_SCALE = 6;

    // Calculate target sizes for all nodes
    const targetSizes = graphData.nodes.map((n) => {
      const deg = degreeMap.get(n.id) || 0;
      const base =
        n.type === "donor" ? 28 : n.type === "organization" ? 24 : 18;
      const minSize =
        n.type === "donor" ? 28 : n.type === "organization" ? 24 : 18;

      if (!scalingMode || scalingMode === null) {
        // Standard/default mode: fixed sizes based on node type
        return n.type === "donor" ? 40 : n.type === "organization" ? 30 : 20;
      } else if (scalingMode === "funding" && n.type === "organization") {
        if (n.estimatedBudget && n.estimatedBudget > 0) {
          const logBudget = Math.log10(n.estimatedBudget);
          const logMin = minBudget > 0 ? Math.log10(minBudget) : 0;
          const logMax = Math.log10(maxBudget);
          const normalized =
            logMax > logMin ? (logBudget - logMin) / (logMax - logMin) : 0.5;
          return Math.round(minSize + normalized * (70 - minSize));
        } else {
          return minSize;
        }
      } else {
        const scaled = Math.round(base + Math.log1p(deg) * SIZE_SCALE);
        return Math.min(80, Math.max(minSize, scaled));
      }
    });

    // Animate the size change over 300ms
    const duration = 300;
    const startTime = performance.now();
    const startSizes = graphData.nodes.map((n) => n.value);
    let animationId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      graphData.nodes.forEach((n, i) => {
        n.value = Math.round(
          startSizes[i] + (targetSizes[i] - startSizes[i]) * eased,
        );
      });

      // Force a visual refresh without reheating the simulation
      // The graph will repaint on the next animation frame
      if (graphRef.current) {
        // Tickle the simulation very gently to force a repaint
        // This doesn't restart the simulation, just triggers a render
        const refresh = (graphRef.current as any).refresh?.();
        if (!refresh) {
          graphRef.current.centerAt(
            graphRef.current.centerAt().x,
            graphRef.current.centerAt().y,
            0,
          );
        }
      }

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [scalingMode, graphData.nodes, graphData.links]);

  // Configure force simulation for better spacing
  useEffect(() => {
    if (!graphRef.current) return;

    const startTime = performance.now();
    const fg = graphRef.current;

    // Moderate repulsion between nodes - lower values = calmer movement
    fg.d3Force("charge").strength(-200);
    fg.d3Force("charge").distanceMax(400);

    // Set link distance dynamically based on node types
    fg.d3Force("link").distance((link: any) => {
      // Donor-project links (value 0) have no attractive force
      if (link.value === 0) return 1; // Minimal distance, no pulling

      const sourceType =
        typeof link.source === "object" ? (link.source as GraphNode).type : "";
      const targetType =
        typeof link.target === "object" ? (link.target as GraphNode).type : "";

      if (
        (sourceType === "organization" && targetType === "project") ||
        (sourceType === "project" && targetType === "organization")
      ) {
        return 100; // Shorter distance for organization-project links
      }

      if (
        (sourceType === "organization" && targetType === "donor") ||
        (sourceType === "donor" && targetType === "organization")
      ) {
        return 200; // Longer distance for organization-donor links
      }

      return 150; // Default distance
    });

    // Set link strength for more stable connections
    // Donor-project links (value 0) have zero strength - visual only, no pull
    fg.d3Force("link").strength((link: any) => {
      if (link.value === 0) return 0; // No attraction for donor-project links
      return 0.3; // Lower strength for calmer settling
    });

    // No center force - allows nodes to distribute naturally based on their connections only
    fg.d3Force("center", null);

    // Enhanced collision force with more iterations for smoother collision avoidance
    fg.d3Force(
      "collision",
      forceCollide((node: any) => {
        const r = (node.value || 10) / 2;
        const padding = 6; // Moderate padding
        return r + padding;
      })
        .iterations(2)
        .strength(0.6),
    ); // Balanced collision handling

    const endTime = performance.now();
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[NetworkGraph] Force simulation configured in ${(endTime - startTime).toFixed(2)}ms`,
      );
    }
  }, [dimensions]); // Re-run when dimensions change to update center position

  // Center view immediately when component mounts or becomes visible
  useEffect(() => {
    if (!graphRef.current || !graphData.nodes.length) return;

    // Calculate the average position of all nodes
    let sumX = 0;
    let sumY = 0;
    graphData.nodes.forEach((node) => {
      sumX += node.x || 0;
      sumY += node.y || 0;
    });
    const avgX = sumX / graphData.nodes.length;
    const avgY = sumY / graphData.nodes.length;

    // Small delay to ensure the graph is rendered
    const timer = setTimeout(() => {
      if (graphRef.current) {
        // Center the view on the average node coordinates, preserving current zoom
        graphRef.current.centerAt(avgX, avgY, 0); // 0ms = instant
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [graphData.nodes, dimensions]); // Re-run when nodes or dimensions change

  // Unfix the central node after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      // Find and unfix the initially fixed node
      const fixedNode = graphData.nodes.find(
        (node: any) => node.__initiallyFixed,
      );
      if (fixedNode) {
        fixedNode.fx = undefined;
        fixedNode.fy = undefined;
        delete (fixedNode as any).__initiallyFixed;
        delete (fixedNode as any).__fixedNodeId;
      }
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [graphData.nodes]); // Re-run when nodes change

  // Apply clustering with smooth transitions and collision avoidance
  useEffect(() => {
    if (!graphRef.current) return;

    const fg = graphRef.current;

    // Create a state signature to detect actual changes
    const currentState = `${clusterByOrgType}-${clusterByAssetType}`;

    // Skip if clustering state hasn't actually changed
    if (lastClusterStateRef.current === currentState) {
      return;
    }

    lastClusterStateRef.current = currentState;

    // Remove any existing cluster forces first
    fg.d3Force("clusterX", null);
    fg.d3Force("clusterY", null);
    fg.d3Force("clusterRepulsion", null);

    if (clusterByOrgType || clusterByAssetType) {
      // Moderate charge repulsion to keep clusters separated while stable
      fg.d3Force("charge").strength(-150);

      // No center force - let clusters spread naturally
      fg.d3Force("center", null);

      // Maintain moderate link strength to preserve connection distances
      // Donor-project links (value 0) have zero strength - visual only, no pull
      fg.d3Force("link").strength((link: any) => {
        if (link.value === 0) return 0; // No attraction for donor-project links
        return 0.25; // Lower strength during clustering for stability
      });

      // Apply link distance function during clustering too
      fg.d3Force("link").distance((link: any) => {
        // Donor-project links (value 0) have no attractive force
        if (link.value === 0) return 0; // Minimal distance, no pulling

        const sourceType = link.source.type || link.source;
        const targetType = link.target.type || link.target;

        if (
          (sourceType === "organization" && targetType === "project") ||
          (sourceType === "project" && targetType === "organization")
        ) {
          return 100;
        }

        if (
          (sourceType === "organization" && targetType === "donor") ||
          (sourceType === "donor" && targetType === "organization")
        ) {
          return 200;
        }

        return 150;
      });

      // Collision within clusters to prevent overlap
      fg.d3Force(
        "collision",
        forceCollide((node: any) => {
          const r = (node.value || 10) / 2;
          const padding = 5;
          return r + padding;
        })
          .iterations(2)
          .strength(0.5),
      ); // Moderate collision force

      const clusterCenters = new Map<string, { x: number; y: number }>();
      // Make clusters much more spread out
      const clusterRadius =
        Math.min(dimensions.width, dimensions.height) * 0.45;

      // Calculate the center of the canvas
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // Collect unique cluster keys and calculate initial positions at member averages
      const clusterKeys = new Set<string>();
      const clusterNodePositions = new Map<
        string,
        { sumX: number; sumY: number; count: number }
      >();

      graphData.nodes.forEach((node) => {
        // Track org-type clusters
        if (clusterByOrgType && node.type === "organization" && node.orgType) {
          const clusterKey = `org-${node.orgType}`;
          clusterKeys.add(clusterKey);

          if (!clusterNodePositions.has(clusterKey)) {
            clusterNodePositions.set(clusterKey, {
              sumX: 0,
              sumY: 0,
              count: 0,
            });
          }
          const pos = clusterNodePositions.get(clusterKey)!;
          pos.sumX += node.x || centerX;
          pos.sumY += node.y || centerY;
          pos.count += 1;
        }

        // Track asset-type clusters (separately, not else-if)
        if (
          clusterByAssetType &&
          node.type === "project" &&
          node.assetTypes &&
          node.assetTypes.length > 0
        ) {
          const clusterKey = `asset-${node.assetTypes[0]}`;
          clusterKeys.add(clusterKey);

          if (!clusterNodePositions.has(clusterKey)) {
            clusterNodePositions.set(clusterKey, {
              sumX: 0,
              sumY: 0,
              count: 0,
            });
          }
          const pos = clusterNodePositions.get(clusterKey)!;
          pos.sumX += node.x || centerX;
          pos.sumY += node.y || centerY;
          pos.count += 1;
        }
      });

      // Initialize cluster centers at the average position of their members
      const clusterArray = Array.from(clusterKeys);

      clusterArray.forEach((key) => {
        const pos = clusterNodePositions.get(key);
        if (pos && pos.count > 0) {
          // Start at the average position of all member nodes
          clusterCenters.set(key, {
            x: pos.sumX / pos.count,
            y: pos.sumY / pos.count,
          });
        } else {
          // Fallback to center if no nodes found (shouldn't happen)
          clusterCenters.set(key, { x: centerX, y: centerY });
        }
      });

      // Moderate clustering force that pulls nodes to their cluster centers
      const baseClusterStrength = 0.4; // Lower for smoother clustering
      const decayStart = 0.5; // Start decaying earlier for stability

      // Dynamic cluster center adjustment and node clustering
      fg.d3Force("clusterRepulsion", (alpha: number) => {
        const clusterArray = Array.from(clusterCenters.entries());
        const hullRepulsionStrength = 0.6; // Strong repulsion when hulls overlap
        const centerAttractionStrength = 0.3; // Strength of attraction toward cluster members
        const hullPadding = 100; // Padding between hulls

        // First, calculate average position and radius for each cluster
        // Track BOTH org-type and asset-type clusters when both are enabled
        const clusterStats = new Map<
          string,
          { sumX: number; sumY: number; count: number; maxRadius: number }
        >();

        for (let i = 0; i < graphData.nodes.length; i++) {
          const node: any = graphData.nodes[i];

          // Track org-type clusters
          if (
            clusterByOrgType &&
            node.type === "organization" &&
            node.orgType
          ) {
            const clusterKey = `org-${node.orgType}`;
            if (!clusterStats.has(clusterKey)) {
              clusterStats.set(clusterKey, {
                sumX: 0,
                sumY: 0,
                count: 0,
                maxRadius: 0,
              });
            }
            const stats = clusterStats.get(clusterKey)!;
            stats.sumX += node.x || 0;
            stats.sumY += node.y || 0;
            stats.count += 1;
          }

          // Track asset-type clusters (separately, not else-if)
          if (
            clusterByAssetType &&
            node.type === "project" &&
            node.assetTypes &&
            node.assetTypes.length > 0
          ) {
            const clusterKey = `asset-${node.assetTypes[0]}`;
            if (!clusterStats.has(clusterKey)) {
              clusterStats.set(clusterKey, {
                sumX: 0,
                sumY: 0,
                count: 0,
                maxRadius: 0,
              });
            }
            const stats = clusterStats.get(clusterKey)!;
            stats.sumX += node.x || 0;
            stats.sumY += node.y || 0;
            stats.count += 1;
          }
        }

        // Calculate cluster centroids
        const clusterCentroids = new Map<string, { x: number; y: number }>();
        clusterStats.forEach((stats, key) => {
          if (stats.count > 0) {
            clusterCentroids.set(key, {
              x: stats.sumX / stats.count,
              y: stats.sumY / stats.count,
            });
          }
        });

        // Calculate hull radii (max distance from centroid to any node edge)
        // Helper function to update radius for a cluster
        const clusterRadii = new Map<string, number>();
        const updateClusterRadius = (clusterKey: string, node: any) => {
          if (clusterCentroids.has(clusterKey)) {
            const centroid = clusterCentroids.get(clusterKey)!;
            const nodeRadius = (node.value || 10) / 2;
            const distToCentroid = Math.sqrt(
              Math.pow((node.x || 0) - centroid.x, 2) +
                Math.pow((node.y || 0) - centroid.y, 2),
            );
            const edgeDist = distToCentroid + nodeRadius + 15; // 15 = base padding

            const currentMax = clusterRadii.get(clusterKey) || 0;
            if (edgeDist > currentMax) {
              clusterRadii.set(clusterKey, edgeDist);
            }
          }
        };

        for (let i = 0; i < graphData.nodes.length; i++) {
          const node: any = graphData.nodes[i];

          // Update radius for org-type clusters
          if (
            clusterByOrgType &&
            node.type === "organization" &&
            node.orgType
          ) {
            updateClusterRadius(`org-${node.orgType}`, node);
          }

          // Update radius for asset-type clusters (separately)
          if (
            clusterByAssetType &&
            node.type === "project" &&
            node.assetTypes &&
            node.assetTypes.length > 0
          ) {
            updateClusterRadius(`asset-${node.assetTypes[0]}`, node);
          }
        }

        // Move cluster centers toward their nodes' average position
        clusterStats.forEach((stats, key) => {
          if (stats.count > 0 && clusterCenters.has(key)) {
            const center = clusterCenters.get(key)!;
            const avgX = stats.sumX / stats.count;
            const avgY = stats.sumY / stats.count;

            // Pull center toward average position of its nodes
            center.x += (avgX - center.x) * centerAttractionStrength * alpha;
            center.y += (avgY - center.y) * centerAttractionStrength * alpha;
          }
        });

        // Apply repulsion between cluster hulls to prevent overlap
        for (let i = 0; i < clusterArray.length; i++) {
          for (let j = i + 1; j < clusterArray.length; j++) {
            const [key1, center1] = clusterArray[i];
            const [key2, center2] = clusterArray[j];

            const centroid1 = clusterCentroids.get(key1);
            const centroid2 = clusterCentroids.get(key2);
            const radius1 = clusterRadii.get(key1) || 50;
            const radius2 = clusterRadii.get(key2) || 50;

            if (!centroid1 || !centroid2) continue;

            const dx = centroid2.x - centroid1.x;
            const dy = centroid2.y - centroid1.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Minimum distance = sum of hull radii + padding
            const minDist = radius1 + radius2 + hullPadding;

            if (dist < minDist && dist > 0) {
              // Hulls are overlapping - apply gentle repulsion
              const overlap = minDist - dist;
              // Cap the force to prevent jumpy movement
              const cappedOverlap = Math.min(overlap, 50);
              const force = cappedOverlap * hullRepulsionStrength;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              // Push centers apart gradually
              center1.x -= fx * alpha;
              center1.y -= fy * alpha;
              center2.x += fx * alpha;
              center2.y += fy * alpha;
            }
          }
        }

        // Build map of non-clustered nodes to their connected cluster centers
        const nodeToConnectedClusters = new Map<string, Set<string>>();

        graphData.links.forEach((link: any) => {
          const sourceNode =
            typeof link.source === "object"
              ? link.source
              : graphData.nodes.find((n: any) => n.id === link.source);
          const targetNode =
            typeof link.target === "object"
              ? link.target
              : graphData.nodes.find((n: any) => n.id === link.target);

          if (sourceNode && targetNode) {
            // Check if source is clustered
            let sourceClusterKey = null;
            if (
              clusterByOrgType &&
              sourceNode.type === "organization" &&
              sourceNode.orgType
            ) {
              sourceClusterKey = `org-${sourceNode.orgType}`;
            } else if (
              clusterByAssetType &&
              sourceNode.type === "project" &&
              sourceNode.assetTypes &&
              sourceNode.assetTypes.length > 0
            ) {
              sourceClusterKey = `asset-${sourceNode.assetTypes[0]}`;
            }

            // Check if target is clustered
            let targetClusterKey = null;
            if (
              clusterByOrgType &&
              targetNode.type === "organization" &&
              targetNode.orgType
            ) {
              targetClusterKey = `org-${targetNode.orgType}`;
            } else if (
              clusterByAssetType &&
              targetNode.type === "project" &&
              targetNode.assetTypes &&
              targetNode.assetTypes.length > 0
            ) {
              targetClusterKey = `asset-${targetNode.assetTypes[0]}`;
            }

            // If source is clustered and target is not, track connection
            if (sourceClusterKey && !targetClusterKey) {
              if (!nodeToConnectedClusters.has(targetNode.id)) {
                nodeToConnectedClusters.set(targetNode.id, new Set());
              }
              nodeToConnectedClusters.get(targetNode.id)!.add(sourceClusterKey);
            }

            // If target is clustered and source is not, track connection
            if (targetClusterKey && !sourceClusterKey) {
              if (!nodeToConnectedClusters.has(sourceNode.id)) {
                nodeToConnectedClusters.set(sourceNode.id, new Set());
              }
              nodeToConnectedClusters.get(sourceNode.id)!.add(targetClusterKey);
            }
          }
        });

        // Apply forces to all nodes in clusters based on updated centers
        for (let i = 0; i < graphData.nodes.length; i++) {
          const node: any = graphData.nodes[i];
          let clusterKey = null;

          if (
            clusterByOrgType &&
            node.type === "organization" &&
            node.orgType
          ) {
            clusterKey = `org-${node.orgType}`;
          } else if (
            clusterByAssetType &&
            node.type === "project" &&
            node.assetTypes &&
            node.assetTypes.length > 0
          ) {
            clusterKey = `asset-${node.assetTypes[0]}`;
          }

          if (clusterKey && clusterCenters.has(clusterKey)) {
            // Node is clustered - pull toward its cluster center
            const center = clusterCenters.get(clusterKey)!;
            const strength =
              alpha > decayStart
                ? baseClusterStrength
                : baseClusterStrength * Math.pow(alpha / decayStart, 0.5);
            node.vx += (center.x - node.x) * strength;
            node.vy += (center.y - node.y) * strength;
          } else if (nodeToConnectedClusters.has(node.id)) {
            // Node is not clustered but connected to clustered nodes
            // Apply weak pull toward average of connected cluster centers
            const connectedClusterKeys = nodeToConnectedClusters.get(node.id)!;
            let avgCenterX = 0;
            let avgCenterY = 0;
            let count = 0;

            connectedClusterKeys.forEach((key) => {
              if (clusterCenters.has(key)) {
                const center = clusterCenters.get(key)!;
                avgCenterX += center.x;
                avgCenterY += center.y;
                count++;
              }
            });

            if (count > 0) {
              avgCenterX /= count;
              avgCenterY /= count;

              // Weak pull (10% of cluster strength) to keep non-clustered nodes near their connected clusters
              const weakStrength = baseClusterStrength * 0.1 * alpha;
              node.vx += (avgCenterX - node.x) * weakStrength;
              node.vy += (avgCenterY - node.y) * weakStrength;
            }
          }
        }
      });

      fg.d3Force("clusterX", null); // Remove old separate X force
      fg.d3Force("clusterY", null); // Remove old separate Y force
    } else {
      // Restore default forces when clustering is off
      fg.d3Force("charge").strength(-200);

      // No center force - nodes distribute naturally
      fg.d3Force("center", null);

      // Restore standard link strength and distances
      // Donor-project links (value 0) have zero strength - visual only, no pull
      fg.d3Force("link").strength((link: any) => {
        if (link.value === 0) return 0; // No attraction for donor-project links
        return 0.3; // Lower strength for stability
      });
      fg.d3Force("link").distance((link: any) => {
        // Donor-project links (value 0) have no attractive force
        if (link.value === 0) return 0; // Minimal distance, no pulling

        const sourceType = link.source.type || link.source;
        const targetType = link.target.type || link.target;

        if (
          (sourceType === "organization" && targetType === "project") ||
          (sourceType === "project" && targetType === "organization")
        ) {
          return 100;
        }

        if (
          (sourceType === "organization" && targetType === "donor") ||
          (sourceType === "donor" && targetType === "organization")
        ) {
          return 200;
        }

        return 150;
      });

      // Restore normal collision force
      fg.d3Force(
        "collision",
        forceCollide((node: any) => {
          const r = (node.value || 10) / 2;
          const padding = 6;
          return r + padding;
        })
          .iterations(2)
          .strength(0.6),
      );
    }

    // Reheat simulation gently - lower alpha for smoother transition
    if (graphRef.current.d3Force("simulation")) {
      graphRef.current.d3Force("simulation").alpha(0.3).restart();
    } else {
      fg.d3ReheatSimulation();
    }
  }, [clusterByOrgType, clusterByAssetType]); // Only re-run when clustering toggles change

  // Note: persistent click-based highlighting removed to avoid performance issues.

  // Handle node hover to highlight connections
  const handleNodeHover = useCallback(
    (node: GraphNode | null) => {
      setHoveredNode(node);

      if (!node) {
        setHoverHighlightNodes(new Set());
        setHoverHighlightLinks(new Set());
        return;
      }

      const newHighlightNodes = new Set<string>();
      const newHighlightLinks = new Set<string>();

      newHighlightNodes.add(node.id);

      // Find all connections for this node
      graphData.links.forEach((link) => {
        const sourceId =
          typeof link.source === "object"
            ? (link.source as any).id
            : link.source;
        const targetId =
          typeof link.target === "object"
            ? (link.target as any).id
            : link.target;

        if (sourceId === node.id || targetId === node.id) {
          newHighlightNodes.add(sourceId);
          newHighlightNodes.add(targetId);
          newHighlightLinks.add(`${sourceId}-${targetId}`);
        }
      });

      setHoverHighlightNodes(newHighlightNodes);
      setHoverHighlightLinks(newHighlightLinks);
    },
    [graphData],
  );

  // Handle node click to open modals
  const handleNodeClick = useCallback(
    (node: any) => {
      // The node object from react-force-graph may have additional properties
      // Extract the relevant fields
      const nodeType = node.type;
      const orgKey = node.orgKey;
      const projectKey = node.projectKey;
      const nodeName = node.name;
      const hasAgencies = node.hasAgencies;

      if (nodeType === "organization" && orgKey) {
        onOpenOrganizationModal(orgKey);
      } else if (nodeType === "project" && projectKey) {
        onOpenProjectModal(projectKey);
      } else if (
        nodeType === "donor" &&
        nodeName &&
        onOpenDonorModal &&
        hasAgencies
      ) {
        // Only allow opening donor modal if the donor has agencies
        onOpenDonorModal(nodeName);
      }
    },
    [onOpenOrganizationModal, onOpenProjectModal, onOpenDonorModal],
  );

  // Handle background click to deselect
  const handleBackgroundClick = useCallback(() => {
    // Close modals by clearing selection (calling with empty string)
    if (selectedOrgKey) {
      onOpenOrganizationModal("");
    }
    if (selectedProjectKey) {
      onOpenProjectModal("");
    }
  }, [
    selectedOrgKey,
    selectedProjectKey,
    onOpenOrganizationModal,
    onOpenProjectModal,
  ]);

  // Get brand colors once on mount - memoized to avoid repeated CSS variable lookups
  const themeColors = useMemo(() => {
    return getBrandColors();
  }, []);

  // Helper function to draw a hexagon on canvas
  const drawHexagon = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
      const angles = [0, 60, 120, 180, 240, 300].map(
        (angle) => (angle * Math.PI) / 180,
      );
      ctx.beginPath();
      angles.forEach((angle, i) => {
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
    },
    [],
  );

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Center the graph view
  const centerView = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50); // 400ms animation, 50px padding
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses ESC) and update portal container
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      // Update portal container to fullscreen element or body
      setFilterBarContainer(
        inFullscreen
          ? (document.fullscreenElement as HTMLElement)
          : document.body,
      );
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Measure FilterBar height in fullscreen mode
  useEffect(() => {
    if (isFullscreen && filterBarRef.current) {
      const updateHeight = () => {
        if (filterBarRef.current) {
          const height = filterBarRef.current.offsetHeight;
          setFilterBarHeight(height);
        }
      };

      // Initial measurement
      updateHeight();

      // Use ResizeObserver to track height changes
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(filterBarRef.current);

      return () => resizeObserver.disconnect();
    } else {
      setFilterBarHeight(0);
    }
  }, [
    isFullscreen,
    filterBarContainer,
    combinedDonors,
    investmentTypes,
    investmentThemes,
    appliedSearchQuery,
  ]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // In fullscreen mode, use full viewport height; otherwise subtract header/nav space
        const height = document.fullscreenElement
          ? window.innerHeight
          : Math.max(600, window.innerHeight - 400);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    // Also listen for fullscreen changes to update dimensions
    document.addEventListener("fullscreenchange", updateDimensions);
    return () => {
      window.removeEventListener("resize", updateDimensions);
      document.removeEventListener("fullscreenchange", updateDimensions);
    };
  }, []);

  // Custom node canvas rendering - only draw the node hexagons
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Use hover-based highlighting only (persistent click-based highlighting removed)
      const isHoverHighlighted =
        hoverHighlightNodes.size > 0 && hoverHighlightNodes.has(node.id);
      const isHighlighted = isHoverHighlighted;
      const isDimmed = hoverHighlightNodes.size > 0 && !isHighlighted;

      // Draw node hexagon
      drawHexagon(ctx, node.x!, node.y!, node.value / 2);

      // Apply dimming or highlighting (subtle)
      if (isDimmed) {
        // Make non-highlighted bubbles more transparent so highlighted ones stand out
        ctx.globalAlpha = 0.35;
      } else if (isHighlighted) {
        ctx.globalAlpha = 1;
        // Softer glow for highlighted nodes
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 8;
      }

      ctx.fillStyle = node.color;
      ctx.fill();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Use specific borders per node type to match badges/modals
      if (node.type === "organization") {
        ctx.strokeStyle = themeColors.brandPrimaryDark;
      } else if (node.type === "project") {
        ctx.strokeStyle = themeColors.badgeOtherText;
      } else if (node.type === "donor") {
        // Use the slate/gray badge text color for donor borders to match legend/tables
        ctx.strokeStyle = themeColors.badgeSlateText || "#64748b";
      } else {
        ctx.strokeStyle = "#000";
      }
      ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 1 / globalScale;
      ctx.stroke();

      // Reset alpha
      ctx.globalAlpha = 1;

      // Draw flag for selected/filtered donor nodes only
      if (
        node.type === "donor" &&
        combinedDonors &&
        combinedDonors.length > 0 &&
        combinedDonors.includes(node.name)
      ) {
        const flagUrl = getCountryFlagUrl(node.name);
        if (flagUrl) {
          // Check if flag image is already loaded in cache
          let flagImg = flagImageCache.current.get(flagUrl);

          if (!flagImg) {
            // Create and load the image
            flagImg = new Image();
            flagImg.crossOrigin = "anonymous"; // Enable CORS for flagcdn.com
            flagImg.src = flagUrl;
            flagImageCache.current.set(flagUrl, flagImg);

            // Trigger a redraw when the image loads
            flagImg.onload = () => {
              // Increment counter to trigger re-render
              setFlagLoadCounter((prev) => prev + 1);
            };
          }
          // Draw the flag if it's loaded (rectangular, not clipped)
          if (flagImg.complete && flagImg.naturalWidth > 0) {
            // Use standard flag aspect ratio (3:2) and scale to fit within node
            const flagHeight = node.value * 0.4; // Flag height is 40% of node diameter
            const flagWidth = flagHeight * 1.5; // 3:2 aspect ratio
            const flagX = node.x! - flagWidth / 2;
            const flagY = node.y! - flagHeight / 2;

            // Draw the rectangular flag image
            ctx.drawImage(flagImg, flagX, flagY, flagWidth, flagHeight);
          }
        }
      }
    },
    [
      hoverHighlightNodes,
      themeColors,
      flagImageCache,
      combinedDonors,
      drawHexagon,
    ],
  );

  // Custom label rendering - drawn after all nodes to appear on top
  const paintNodeLabel = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      // Use consistent font size that scales properly
      const baseFontSize = 12;
      const fontSize = baseFontSize / globalScale;
      ctx.font = `${fontSize}px Sans-Serif`;

      const isHoverHighlighted =
        hoverHighlightNodes.size > 0 && hoverHighlightNodes.has(node.id);
      const isDirectlyHovered = hoveredNode && hoveredNode.id === node.id;
      const isHighlighted = isHoverHighlighted;

      // Draw label if hovered, highlighted, or all names are shown
      if (isDirectlyHovered || isHighlighted || showAllNames) {
        // Use short org names when the "show all names" view is active,
        // otherwise show full name when directly hovered and short when highlighted via connections.
        let label = node.name;
        if (
          node.type === "organization" &&
          node.orgShortName &&
          (showAllNames || (!isDirectlyHovered && isHighlighted))
        ) {
          label = node.orgShortName;
        }

        // Measure text with current font settings
        const textWidth = ctx.measureText(label).width;

        // Scale padding based on zoom level to maintain consistent visual appearance
        const paddingX = (baseFontSize * 0.4) / globalScale;
        const paddingY = (baseFontSize * 0.3) / globalScale;
        const bgWidth = textWidth + paddingX * 2;
        const bgHeight = fontSize + paddingY * 2;

        // Position label below the node
        const offsetY = node.value / 2 / (globalScale * 2) + 20;
        const labelY = node.y! + offsetY;

        // Draw background
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(
          node.x! - bgWidth / 2,
          labelY - bgHeight / 2,
          bgWidth,
          bgHeight,
        );

        // Draw text
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1e293b";
        ctx.fillText(label, node.x!, labelY);
      }
    },
    [hoveredNode, hoverHighlightNodes, showAllNames],
  );

  // Define the clickable area for nodes (required when using custom nodeCanvasObject)
  const nodePointerAreaPaint = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      // Draw a hexagon matching the node's size to define the clickable area
      ctx.fillStyle = color;
      drawHexagon(ctx, node.x!, node.y!, node.value / 2);
      ctx.fill();
    },
    [drawHexagon],
  );

  // Memoize cluster data to avoid recalculating node groupings on every render
  const clusterData = useMemo(() => {
    if (!clusterByOrgType && !clusterByAssetType) return null;

    const clusters = new Map<string, GraphNode[]>();

    graphData.nodes.forEach((node) => {
      let clusterKey = null;

      if (clusterByOrgType && node.type === "organization" && node.orgType) {
        clusterKey = `org-${node.orgType}`;
      } else if (
        clusterByAssetType &&
        node.type === "project" &&
        node.assetTypes &&
        node.assetTypes.length > 0
      ) {
        clusterKey = `asset-${node.assetTypes[0]}`;
      }

      if (clusterKey) {
        if (!clusters.has(clusterKey)) {
          clusters.set(clusterKey, []);
        }
        clusters.get(clusterKey)!.push(node);
      }
    });

    return clusters;
  }, [graphData.nodes, clusterByOrgType, clusterByAssetType]);

  // Combined cluster drawing - calculates geometry once and can draw both hulls and labels
  const drawClusters = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      globalScale: number,
      drawType: "hulls" | "labels",
    ) => {
      if (!clusterData) return;

      clusterData.forEach((nodes, clusterKey) => {
        if (nodes.length < 1) return; // Allow single-node clusters

        // Calculate convex hull points with adaptive padding (shared logic)
        const basePadding = 15;
        const padding = Math.max(5, basePadding / globalScale);
        const points = nodes.map((n) => ({
          x: n.x!,
          y: n.y!,
          r: n.value / 2 + padding,
        }));

        if (points.length === 0) return;

        // Calculate centroid and radius (shared logic)
        const centroidX =
          points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centroidY =
          points.reduce((sum, p) => sum + p.y, 0) / points.length;
        const maxDist = Math.max(
          ...points.map(
            (p) =>
              Math.sqrt(
                Math.pow(p.x - centroidX, 2) + Math.pow(p.y - centroidY, 2),
              ) + p.r,
          ),
        );
        const extraRadius = Math.max(5, 8 / globalScale);

        if (drawType === "hulls") {
          // Draw cluster background hull
          ctx.beginPath();
          ctx.arc(centroidX, centroidY, maxDist + extraRadius, 0, 2 * Math.PI);

          if (clusterKey.startsWith("org-")) {
            ctx.fillStyle = "rgba(243, 195, 92, 0.1)";
            ctx.strokeStyle = "rgba(188, 132, 15, 0.3)";
          } else {
            ctx.fillStyle = "rgba(215, 216, 245, 0.15)";
            ctx.strokeStyle = "rgba(77, 71, 156, 0.3)";
          }

          ctx.lineWidth = 2 / globalScale;
          ctx.setLineDash([5 / globalScale, 5 / globalScale]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Draw cluster label
          const fontSize = 14 / globalScale;
          ctx.font = `bold ${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const label = clusterKey.replace("org-", "").replace("asset-", "");
          const labelY = centroidY - maxDist - extraRadius - 15 / globalScale;

          // Draw label background
          const labelWidth = ctx.measureText(label).width;
          const labelPadding = 6 / globalScale;
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fillRect(
            centroidX - labelWidth / 2 - labelPadding,
            labelY - fontSize / 2 - labelPadding,
            labelWidth + labelPadding * 2,
            fontSize + labelPadding * 2,
          );

          // Draw label text
          ctx.fillStyle = clusterKey.startsWith("org-") ? "#BC840F" : "#4d479c";
          ctx.fillText(label, centroidX, labelY);
        }
      });
    },
    [clusterData],
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        {/* Graph Controls - Top Right */}
        <div
          className="absolute right-4 z-10 transition-all duration-200"
          style={{ top: isFullscreen ? `${filterBarHeight + 30}px` : "16px" }}
        >
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm backdrop-blur-lg">
            <div className="flex items-center gap-0 p-2">
              {/* Collapsible Content */}
              <div 
                className={`flex items-center gap-0 overflow-hidden transition-all duration-300 ease-in-out ${
                  settingsCollapsed 
                    ? 'max-w-0 opacity-0' 
                    : 'max-w-96 opacity-100'
                }`}
                style={{
                  maxWidth: settingsCollapsed ? '0px' : '24rem'
                }}
              >
                {/* Clustering Section */}
                <div className="flex items-center gap-2 px-2">
                  <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                    Cluster
                  </div>
                  <button
                    onClick={() => setClusterByOrgType(!clusterByOrgType)}
                    className={`rounded p-1.5 transition-colors ${
                      clusterByOrgType
                        ? "bg-amber-100 text-amber-700"
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                    style={clusterByOrgType ? { backgroundColor: "rgba(243, 195, 92, 0.3)", color: "#BC840F" } : {}}
                    title="Cluster by organization type"
                  >
                    <Building2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setClusterByAssetType(!clusterByAssetType)}
                    className={`rounded p-1.5 transition-colors ${
                      clusterByAssetType
                        ? "text-indigo-700"
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                    style={clusterByAssetType ? { backgroundColor: "rgba(215, 216, 245, 0.3)", color: "#4d479c" } : {}}
                    title="Cluster by asset type"
                  >
                    <Package className="h-4 w-4" />
                  </button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />

                {/* Scaling Section */}
                <div className="flex items-center gap-2 px-2">
                  <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                    Scale
                  </div>
                  <button
                    onClick={() => {
                      if (scalingMode === "connections") {
                        // Toggle off
                        setScalingMode(null);
                      } else {
                        // Toggle on, deselect funding
                        setScalingMode("connections");
                      }
                    }}
                    className={`rounded p-1.5 transition-colors ${
                      scalingMode === "connections"
                        ? "bg-slate-300 text-slate-800"
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                    title="Size by connections"
                  >
                    <GitBranch className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (scalingMode === "funding") {
                        // Toggle off
                        setScalingMode(null);
                      } else {
                        // Toggle on, deselect connections
                        setScalingMode("funding");
                      }
                    }}
                    className={`rounded p-1.5 transition-colors ${
                      scalingMode === "funding"
                        ? "bg-slate-300 text-slate-800"
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                    title="Size by funding"
                  >
                    <DollarSign className="h-4 w-4" />
                  </button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />

                {/* Names Section */}
                <div className="flex items-center gap-2 px-2">
                  <button
                    onClick={() => setShowAllNames(!showAllNames)}
                    className={`rounded p-1.5 transition-colors ${
                      showAllNames
                        ? "bg-slate-300 text-slate-800"
                        : "text-slate-600 hover:bg-slate-200/50"
                    }`}
                    title="Toggle entity names"
                  >
                    <Type className="h-4 w-4" />
                  </button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200" />
              </div>

              {/* Settings Toggle Chevron */}
              <button
                onClick={() => setSettingsCollapsed(!settingsCollapsed)}
                className="rounded p-1.5 transition-colors hover:bg-slate-200/50 flex-shrink-0"
                title={settingsCollapsed ? "Expand controls" : "Collapse controls"}
              >
                {settingsCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                )}
              </button>

              {/* View Section */}
              <div className="flex items-center gap-1 px-2">
                <button
                  onClick={centerView}
                  className="rounded p-1.5 transition-colors hover:bg-slate-200/50"
                  title="Center view"
                >
                  <Crosshair className="h-4 w-4 text-slate-600" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="rounded p-1.5 transition-colors hover:bg-slate-200/50"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4 text-slate-600" />
                  ) : (
                    <Maximize className="h-4 w-4 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Clustering Controls - Collapsible */}
        <div
          className="absolute left-4 z-10 transition-all duration-200"
          style={{ top: isFullscreen ? `${filterBarHeight + 30}px` : "16px" }}
        >
          {/* Expanded Legend */}
          <div 
            className={`w-30 rounded-lg border border-slate-200 bg-white shadow-sm backdrop-blur-lg overflow-hidden transition-all duration-300 ease-in-out absolute ${
              legendCollapsed 
                ? 'max-w-0 opacity-0 pointer-events-none' 
                : 'max-w-64 opacity-100'
            }`}
            style={{
              maxWidth: legendCollapsed ? '0px' : '16rem'
            }}
          >
              {/* Legend */}
              <div className="p-2.5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                    Legend
                  </div>
                  <button
                    onClick={() => setLegendCollapsed(true)}
                    className="rounded p-1 transition-colors hover:bg-slate-200/50"
                    title="Hide legend"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="text-slate-600"
                    >
                      <path
                        d="M15 18l-6-6 6-6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {combinedDonors && combinedDonors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className="shrink-0"
                      >
                        <polygon
                          points="7,1 12,4 12,10 7,13 2,10 2,4"
                          fill="#94a3b8"
                          stroke="#64748b"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <span className="text-xs text-slate-600">
                        Sel. Donors
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      className="shrink-0"
                    >
                      <polygon
                        points="7,1 12,4 12,10 7,13 2,10 2,4"
                        fill="#cbd5e1"
                        stroke="var(--badge-slate-text)"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className="text-xs text-slate-600">Donors</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      className="shrink-0"
                    >
                      <polygon
                        points="7,1 12,4 12,10 7,13 2,10 2,4"
                        fill="var(--brand-primary-light)"
                        stroke="var(--brand-primary-dark)"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className="text-xs text-slate-600">
                      Organizations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      className="shrink-0"
                    >
                      <polygon
                        points="7,1 12,4 12,10 7,13 2,10 2,4"
                        fill="var(--badge-other-bg)"
                        stroke="var(--badge-other-text)"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <span className="text-xs text-slate-600">Assets</span>
                  </div>
                </div>
              </div>
            </div>

          {/* Collapsed Legend Button */}
          <button
            onClick={() => setLegendCollapsed(false)}
            className={`rounded border border-slate-200 bg-white p-2 shadow-sm transition-all duration-300 ease-in-out ${
              legendCollapsed 
                ? 'opacity-100 pointer-events-auto' 
                : 'opacity-0 pointer-events-none'
            }`}
            title="Show legend"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-slate-700"
            >
              <path
                d="M9 18l6-6-6-6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel=""
          nodeVal="value"
          nodeCanvasObject={paintNode}
          nodeCanvasObjectMode={() => "replace"}
          nodePointerAreaPaint={nodePointerAreaPaint}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          onRenderFramePre={(ctx, globalScale) => {
            // Draw cluster hulls first (behind everything)
            drawClusters(ctx, globalScale, "hulls");
          }}
          onRenderFramePost={(ctx, globalScale) => {
            // Track current zoom level for use in linkWidth callback
            globalScaleRef.current = globalScale;
            // Draw all node labels
            graphData.nodes.forEach((node) =>
              paintNodeLabel(node, ctx, globalScale),
            );
            // Draw cluster labels on top of everything
            drawClusters(ctx, globalScale, "labels");
          }}
          linkColor={(link) => {
            const sourceId =
              typeof link.source === "object"
                ? (link.source as any).id
                : link.source;
            const targetId =
              typeof link.target === "object"
                ? (link.target as any).id
                : link.target;
            const linkId = `${sourceId}-${targetId}`;

            // Donor-project links (value 0) should be more visible
            if (link.value === 0) {
              return "rgba(203, 213, 225, 0.5)"; // More visible than before
            }

            // Hover-based highlights only
            const isHoverHighlight =
              hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);

            if (hoverHighlightLinks.size === 0) return "#cbd5e1";
            if (isHoverHighlight) return themeColors.brandPrimary;
            // Make non-highlighted links more visible when something is highlighted
            return "rgba(203, 213, 225, 0.6)";
          }}
          linkWidth={(link) => {
            const sourceId =
              typeof link.source === "object"
                ? (link.source as any).id
                : link.source;
            const targetId =
              typeof link.target === "object"
                ? (link.target as any).id
                : link.target;
            const linkId = `${sourceId}-${targetId}`;

            // Donor-project links (value 0) should be more visible
            if (link.value === 0) {
              return 0.7 * globalScaleRef.current; // More visible than before
            }

            const isHoverHighlight =
              hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);

            // Scale line width with zoom: thicker when zoomed out, thinner when zoomed in
            const baseWidth =
              hoverHighlightLinks.size === 0 ? 1 : isHoverHighlight ? 2 : 1;
            return baseWidth * globalScaleRef.current * 1.1;
          }}
          d3VelocityDecay={0.6}
          d3AlphaDecay={0.02}
          cooldownTicks={300}
          warmupTicks={50}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />

        {/* Empty State Modal - Inside canvas */}
        {graphData.nodes.length === 0 && (
          <NoResultsModal onResetFilters={onResetFilters} />
        )}
      </div>

      {/* Filter Bar Portal - render outside overflow-hidden container when in fullscreen */}
      {isFullscreen &&
        filterBarContainer &&
        createPortal(
          <div
            ref={filterBarRef}
            className="fixed top-4 right-4 left-4 z-[100] rounded-lg border border-slate-200 bg-white p-4 shadow-lg backdrop-blur-lg"
          >
            <FilterBar
              searchQuery={searchQuery}
              appliedSearchQuery={appliedSearchQuery}
              onSearchChange={onSearchChange}
              onSearchSubmit={onSearchSubmit}
              combinedDonors={combinedDonors}
              availableDonorCountries={availableDonorCountries}
              onDonorsChange={onDonorsChange}
              investmentTypes={investmentTypes}
              allKnownInvestmentTypes={allKnownInvestmentTypes}
              onTypesChange={onTypesChange}
              investmentThemes={investmentThemes}
              allKnownInvestmentThemes={allKnownInvestmentThemes}
              investmentThemesByType={investmentThemesByType}
              onThemesChange={onThemesChange}
              onResetFilters={onResetFilters}
              projectCountsByType={projectCountsByType}
              projectCountsByTheme={projectCountsByTheme}
              filterDescription={filterDescription}
              portalContainer={filterBarContainer}
              isFullscreen={true}
            />
          </div>,
          filterBarContainer,
        )}
    </>
  );
};

export default NetworkGraph;
