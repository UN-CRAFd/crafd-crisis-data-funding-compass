'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { forceCollide } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize, Minimize, Crosshair } from 'lucide-react';
import type { OrganizationWithProjects } from '../types/airtable';
import FilterBar from './FilterBar';
import NoResultsModal from './NoResultsModal';
import { Button } from './ui/button';
import { getCountryFlagUrl } from './CountryFlag';

interface NetworkGraphProps {
    organizationsWithProjects: OrganizationWithProjects[];
    allOrganizations?: OrganizationWithProjects[]; // Unfiltered organizations for counting
    onOpenOrganizationModal: (orgKey: string) => void;
    onOpenProjectModal: (projectKey: string) => void;
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
}

interface GraphNode {
    id: string;
    name: string;
    type: 'donor' | 'organization' | 'project';
    value: number; // Size of the node
    color: string;
    orgKey?: string;
    projectKey?: string;
    orgType?: string; // For organization clustering
    assetTypes?: string[]; // For project/asset clustering
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
    selectedOrgKey,
    selectedProjectKey,
    // Filter props
    searchQuery = '',
    appliedSearchQuery = '',
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
}) => {
    const graphRef = useRef<any>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
    const [hoverHighlightNodes, setHoverHighlightNodes] = useState<Set<string>>(new Set());
    const [hoverHighlightLinks, setHoverHighlightLinks] = useState<Set<string>>(new Set());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const globalScaleRef = useRef<number>(1); // Track current zoom scale
    const [clusterByOrgType, setClusterByOrgType] = useState(false);
    const [clusterByAssetType, setClusterByAssetType] = useState(false);
    const [legendCollapsed, setLegendCollapsed] = useState(false);
    const lastClusterStateRef = useRef<string>(''); // Track last clustering state to prevent unnecessary updates
    const [filterBarContainer, setFilterBarContainer] = useState<HTMLElement | null>(null);
    const lastFiltersRef = useRef<string>(''); // Track filter state to detect changes
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
            search: appliedSearchQuery
        });
        
        const currentOrgCount = organizationsWithProjects.length;
        
        // If filters have changed or organization count changed (graph refresh)
        if (lastFiltersRef.current && 
            (lastFiltersRef.current !== currentFilters || lastOrgCountRef.current !== currentOrgCount)) {
            setClusterByOrgType(false);
            setClusterByAssetType(false);
        }
        
        lastFiltersRef.current = currentFilters;
        lastOrgCountRef.current = currentOrgCount;
    }, [combinedDonors, investmentTypes, investmentThemes, appliedSearchQuery, organizationsWithProjects]);

    // Calculate project counts for each investment type based on current donors, query, and themes
    // (but not filtered by types themselves)
    const projectCountsByType = useMemo(() => {
        const projectsByType: Record<string, Set<string>> = {};
        const allOrgs = allOrganizations || organizationsWithProjects;
        
        allOrgs.forEach(org => {
            // Filter by donors (AND logic - all selected donors must be present)
            if (combinedDonors.length > 0) {
                const hasAllDonors = combinedDonors.every(selectedDonor => 
                    org.donorCountries.includes(selectedDonor)
                );
                if (!hasAllDonors) return;
            }

            org.projects.forEach(project => {
                // Filter by search query
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
                    const matchesSearch = 
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }
                
                // Filter by themes
                if (investmentThemes.length > 0) {
                    const hasMatchingTheme = project.investmentThemes?.some(theme =>
                        investmentThemes.some(selectedTheme => 
                            theme.toLowerCase().trim() === selectedTheme.toLowerCase().trim()
                        )
                    );
                    if (!hasMatchingTheme) return;
                }
                
                // Count this project for each of its types
                project.investmentTypes?.forEach(type => {
                    const normalizedType = type.toLowerCase().trim();
                    if (!projectsByType[normalizedType]) {
                        projectsByType[normalizedType] = new Set();
                    }
                    projectsByType[normalizedType].add(project.id);
                });
            });
        });
        
        // Convert Sets to counts
        const counts: Record<string, number> = {};
        Object.keys(projectsByType).forEach(type => {
            counts[type] = projectsByType[type].size;
        });
        return counts;
    }, [allOrganizations, organizationsWithProjects, combinedDonors, appliedSearchQuery, investmentThemes]);

    // Calculate project counts for each theme based on current donors, query, and types
    // (but not filtered by themes themselves)
    const projectCountsByTheme = useMemo(() => {
        const projectsByTheme: Record<string, Set<string>> = {};
        const allOrgs = allOrganizations || organizationsWithProjects;
        
        allOrgs.forEach(org => {
            // Filter by donors (AND logic - all selected donors must be present)
            if (combinedDonors.length > 0) {
                const hasAllDonors = combinedDonors.every(selectedDonor => 
                    org.donorCountries.includes(selectedDonor)
                );
                if (!hasAllDonors) return;
            }
            
            org.projects.forEach(project => {
                // Filter by search query
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
                    const matchesSearch = 
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }
                
                // Filter by types
                if (investmentTypes.length > 0) {
                    const hasMatchingType = project.investmentTypes?.some(type =>
                        investmentTypes.some(selectedType => 
                            type.toLowerCase().trim() === selectedType.toLowerCase().trim()
                        )
                    );
                    if (!hasMatchingType) return;
                }
                
                // Count this project for each of its themes
                project.investmentThemes?.forEach(theme => {
                    const normalizedTheme = theme.toLowerCase().trim();
                    if (!projectsByTheme[normalizedTheme]) {
                        projectsByTheme[normalizedTheme] = new Set();
                    }
                    projectsByTheme[normalizedTheme].add(project.id);
                });
            });
        });
        
        // Convert Sets to counts
        const counts: Record<string, number> = {};
        Object.keys(projectsByTheme).forEach(theme => {
            counts[theme] = projectsByTheme[theme].size;
        });
        return counts;
    }, [allOrganizations, organizationsWithProjects, combinedDonors, appliedSearchQuery, investmentTypes]);

    // Handle fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch((err) => {
                console.error('Error attempting to enable fullscreen:', err);
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
            setFilterBarContainer(inFullscreen ? (document.fullscreenElement as HTMLElement) : document.body);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
    }, [isFullscreen, filterBarContainer, combinedDonors, investmentTypes, investmentThemes, appliedSearchQuery]);

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
        window.addEventListener('resize', updateDimensions);
        // Also listen for fullscreen changes to update dimensions
        document.addEventListener('fullscreenchange', updateDimensions);
        return () => {
            window.removeEventListener('resize', updateDimensions);
            document.removeEventListener('fullscreenchange', updateDimensions);
        };
    }, []);

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
        organizationsWithProjects.forEach(org => {
            org.donorCountries.forEach(donor => donorSet.add(donor));
        });

        // Get brand colors from CSS variables (cached)
        const getBrandColor = (varName: string): string => {
            if (typeof window !== 'undefined') {
                const color = getComputedStyle(document.documentElement)
                    .getPropertyValue(varName)
                    .trim();
                return color || '#e6af26'; // Fallback to amber
            }
            return '#e6af26';
        };

        const brandPrimary = getBrandColor('--brand-primary');
        const brandBgLight = getBrandColor('--brand-primary-light');
        const badgeOtherBg = getBrandColor('--badge-other-bg');
        const badgeSlateBg = getBrandColor('--badge-slate-bg');
        const selectedDonorColor = '#94a3b8'; // Medium gray for filtered donors (slate-400)

        // Add donor nodes - largest, using slate colors (like in tables)
        // Arrange donors in a circle around the top of the canvas
        const donorArray = Array.from(donorSet);
        donorArray.forEach((donor, index) => {
            // Use darker color if this donor is in the filter
            const isFiltered = combinedDonors && combinedDonors.length > 0 && combinedDonors.includes(donor);
            
            // Calculate initial position in an arc at the top
            const angle = (index / donorArray.length) * Math.PI - Math.PI / 2; // Arc from left to right at top
            const x = centerX + Math.cos(angle) * spreadRadius * 0.8;
            const y = centerY - spreadRadius * 0.6; // Position toward top
            
            nodes.push({
                id: `donor-${donor}`,
                name: donor,
                type: 'donor',
                value: 25, // Larger nodes for donors
                color: isFiltered ? selectedDonorColor : badgeSlateBg, // Medium gray for filtered donors
                x,
                y,
            });
        });

        // Add organization and project nodes
        let orgIndex = 0;
        const totalOrgs = organizationsWithProjects.length;
        
        organizationsWithProjects.forEach(org => {
            const orgNodeId = `org-${org.id}`;
            
            // Calculate initial position for organizations in a circle around center
            const angle = (orgIndex / totalOrgs) * 2 * Math.PI;
            const x = centerX + Math.cos(angle) * spreadRadius * 0.5;
            const y = centerY + Math.sin(angle) * spreadRadius * 0.5;
            
            // Add organization node - medium, using amber/golden badge color (like ACAPS badge)
            nodes.push({
                id: orgNodeId,
                name: org.organizationName,
                type: 'organization',
                value: 22, // Medium nodes for organizations
                color: brandBgLight, // Uses --brand-bg-light (amber/golden from organization badges)
                orgKey: org.orgShortName, // Use orgShortName for modal/URL
                orgType: org.type, // Store org type for clustering
                x,
                y,
            });
            
            orgIndex++;

            // Link organizations to donors
            org.donorCountries.forEach(donor => {
                links.push({
                    source: `donor-${donor}`,
                    target: orgNodeId,
                    value: 2,
                });
            });

            // Add project nodes and link to organizations - using purple/indigo badge color
            org.projects.forEach(project => {
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
                        type: 'project',
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
            });
        });

        // Compute node degrees (number of incident links) to derive a relevance score
        const degreeMap = new Map<string, number>();
        nodes.forEach(n => degreeMap.set(n.id, 0));
        links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
            degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
            degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
        });

        // Scale node visual size by log(degree+1) to keep growth controlled.
        // Preserve original base sizes per type and add a scaled boost.
        // Base sizes ensure: donors > organizations > assets at all connection levels
        const SIZE_SCALE = 6; // multiplier for the log-scaling term
        nodes.forEach(n => {
            const deg = degreeMap.get(n.id) || 0;
            // Base sizes: donors start larger, then organizations, then projects/assets
            const base = n.type === 'donor' ? 28 : n.type === 'organization' ? 24 : 18;
            const scaled = Math.round(base + Math.log1p(deg) * SIZE_SCALE);
            // Clamp to reasonable bounds to avoid overly large/small nodes
            // Min bounds also maintain the hierarchy: donors >= 28, orgs >= 24, assets >= 18
            const minSize = n.type === 'donor' ? 28 : n.type === 'organization' ? 24 : 18;
            n.value = Math.min(80, Math.max(minSize, scaled));
        });

        // Calculate average coordinates
        let sumX = 0;
        let sumY = 0;
        nodes.forEach(n => {
            sumX += n.x || 0;
            sumY += n.y || 0;
        });
        const avgX = sumX / nodes.length;
        const avgY = sumY / nodes.length;
        
        // Find the most central node (highest degree)
        let maxDegree = 0;
        let mostCentralNode: GraphNode | null = null;
        
        nodes.forEach(n => {
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
        if (process.env.NODE_ENV === 'development') {
            console.log(`[NetworkGraph] Graph data computed in ${(endTime - startTime).toFixed(2)}ms (${nodes.length} nodes, ${links.length} links)`);
        }

        return { nodes, links };
    }, [organizationsWithProjects]);

    // Configure force simulation for better spacing
    useEffect(() => {
        if (!graphRef.current) return;
        
        const startTime = performance.now();
        const fg = graphRef.current;

        // Moderate repulsion between nodes for calmer movement
        fg.d3Force('charge').strength(-400);
        fg.d3Force('charge').distanceMax(500);

        // Set link distance dynamically based on node types
        fg.d3Force('link').distance((link: any) => {
            const sourceType = typeof link.source === 'object' ? (link.source as GraphNode).type : '';
            const targetType = typeof link.target === 'object' ? (link.target as GraphNode).type : '';

            if ((sourceType === 'organization' && targetType === 'project') ||
                (sourceType === 'project' && targetType === 'organization')) {
                return 100; // Shorter distance for organization-project links
            }

            if ((sourceType === 'organization' && targetType === 'donor') ||
                (sourceType === 'donor' && targetType === 'organization')) {
                return 200; // Longer distance for organization-donor links
            }

            return 150; // Default distance
        });

        // Set link strength for more stable connections
        fg.d3Force('link').strength(0.5);

        // No center force - allows nodes to distribute naturally based on their connections only
        fg.d3Force('center', null);

        // Enhanced collision force with more iterations for smoother collision avoidance
        fg.d3Force('collision', forceCollide((node: any) => {
            const r = (node.value || 10) / 2;
            const padding = 8; // More padding for smoother spacing
            return r + padding;
        }).iterations(3).strength(0.8)); // More iterations and higher strength for better collision handling

        // Higher velocity decay for calmer, less jittery movement
        fg.d3Force('simulation')?.velocityDecay(0.7);

        const endTime = performance.now();
        if (process.env.NODE_ENV === 'development') {
            console.log(`[NetworkGraph] Force simulation configured in ${(endTime - startTime).toFixed(2)}ms`);
        }
    }, [dimensions]); // Re-run when dimensions change to update center position

    // Center view immediately when component mounts or becomes visible
    useEffect(() => {
        if (!graphRef.current || !graphData.nodes.length) return;
        
        // Calculate the average position of all nodes
        let sumX = 0;
        let sumY = 0;
        graphData.nodes.forEach(node => {
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
            const fixedNode = graphData.nodes.find((node: any) => node.__initiallyFixed);
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
        fg.d3Force('clusterX', null);
        fg.d3Force('clusterY', null);
        fg.d3Force('clusterRepulsion', null);
        
        if (clusterByOrgType || clusterByAssetType) {
            // Strong charge repulsion to keep clusters well separated
            fg.d3Force('charge').strength(-300);
            
            // No center force - let clusters spread naturally
            fg.d3Force('center', null);
            
            // Maintain standard link strength to preserve connection distances
            fg.d3Force('link').strength(0.5);
            
            // Apply link distance function during clustering too
            fg.d3Force('link').distance((link: any) => {
                const sourceType = link.source.type || link.source;
                const targetType = link.target.type || link.target;

                if ((sourceType === 'organization' && targetType === 'project') ||
                    (sourceType === 'project' && targetType === 'organization')) {
                    return 100;
                }

                if ((sourceType === 'organization' && targetType === 'donor') ||
                    (sourceType === 'donor' && targetType === 'organization')) {
                    return 200;
                }

                return 150;
            });
            
            // More collision within clusters to prevent overlap
            fg.d3Force('collision', forceCollide((node: any) => {
                const r = (node.value || 10) / 2;
                const padding = 6; // More padding to spread nodes within cluster
                return r + padding;
            }).iterations(2).strength(0.7)); // Stronger collision force
            
            const clusterCenters = new Map<string, { x: number; y: number }>();
            // Make clusters much more spread out
            const clusterRadius = Math.min(dimensions.width, dimensions.height) * 0.45;
            
            // Calculate the center of the canvas
            const centerX = dimensions.width / 2;
            const centerY = dimensions.height / 2;
            
            // Collect unique cluster keys and calculate initial positions at member averages
            const clusterKeys = new Set<string>();
            const clusterNodePositions = new Map<string, { sumX: number; sumY: number; count: number }>();
            
            graphData.nodes.forEach(node => {
                let clusterKey = null;
                
                if (clusterByOrgType && node.type === 'organization' && node.orgType) {
                    clusterKey = `org-${node.orgType}`;
                } else if (clusterByAssetType && node.type === 'project' && node.assetTypes && node.assetTypes.length > 0) {
                    clusterKey = `asset-${node.assetTypes[0]}`;
                }
                
                if (clusterKey) {
                    clusterKeys.add(clusterKey);
                    
                    // Accumulate positions for averaging
                    if (!clusterNodePositions.has(clusterKey)) {
                        clusterNodePositions.set(clusterKey, { sumX: 0, sumY: 0, count: 0 });
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
                        y: pos.sumY / pos.count
                    });
                } else {
                    // Fallback to center if no nodes found (shouldn't happen)
                    clusterCenters.set(key, { x: centerX, y: centerY });
                }
            });
            
            // Strong clustering force that pulls nodes to their cluster centers
            const baseClusterStrength = 0.8; // Increased from 0.5 for stronger clustering
            const decayStart = 0.7; // Start decaying very late
            
            // Dynamic cluster center adjustment and node clustering
            fg.d3Force('clusterRepulsion', (alpha: number) => {
                const clusterArray = Array.from(clusterCenters.entries());
                const hullRepulsionStrength = 50000; // Strong repulsion between cluster centers
                const centerAttractionStrength = 0.3; // Strength of attraction toward cluster members
                
                // First, calculate average position of nodes in each cluster
                const clusterNodePositions = new Map<string, { sumX: number; sumY: number; count: number }>();
                
                for (let i = 0; i < graphData.nodes.length; i++) {
                    const node: any = graphData.nodes[i];
                    let clusterKey = null;
                    
                    if (clusterByOrgType && node.type === 'organization' && node.orgType) {
                        clusterKey = `org-${node.orgType}`;
                    } else if (clusterByAssetType && node.type === 'project' && node.assetTypes && node.assetTypes.length > 0) {
                        clusterKey = `asset-${node.assetTypes[0]}`;
                    }
                    
                    if (clusterKey) {
                        if (!clusterNodePositions.has(clusterKey)) {
                            clusterNodePositions.set(clusterKey, { sumX: 0, sumY: 0, count: 0 });
                        }
                        const pos = clusterNodePositions.get(clusterKey)!;
                        pos.sumX += node.x || 0;
                        pos.sumY += node.y || 0;
                        pos.count += 1;
                    }
                }
                
                // Move cluster centers toward their nodes' average position
                clusterNodePositions.forEach((pos, key) => {
                    if (pos.count > 0 && clusterCenters.has(key)) {
                        const center = clusterCenters.get(key)!;
                        const avgX = pos.sumX / pos.count;
                        const avgY = pos.sumY / pos.count;
                        
                        // Pull center toward average position of its nodes
                        center.x += (avgX - center.x) * centerAttractionStrength * alpha;
                        center.y += (avgY - center.y) * centerAttractionStrength * alpha;
                    }
                });
                
                // Apply repulsion between cluster centers to keep them separated
                for (let i = 0; i < clusterArray.length; i++) {
                    for (let j = i + 1; j < clusterArray.length; j++) {
                        const [key1, center1] = clusterArray[i];
                        const [key2, center2] = clusterArray[j];
                        
                        const dx = center2.x - center1.x;
                        const dy = center2.y - center1.y;
                        const distSq = dx * dx + dy * dy;
                        
                        if (distSq > 0) {
                            const dist = Math.sqrt(distSq);
                            const force = hullRepulsionStrength / distSq; // Inverse square law
                            const fx = (dx / dist) * force;
                            const fy = (dy / dist) * force;
                            
                            // Push centers apart
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
                    const sourceNode = typeof link.source === 'object' ? link.source : graphData.nodes.find((n: any) => n.id === link.source);
                    const targetNode = typeof link.target === 'object' ? link.target : graphData.nodes.find((n: any) => n.id === link.target);
                    
                    if (sourceNode && targetNode) {
                        // Check if source is clustered
                        let sourceClusterKey = null;
                        if (clusterByOrgType && sourceNode.type === 'organization' && sourceNode.orgType) {
                            sourceClusterKey = `org-${sourceNode.orgType}`;
                        } else if (clusterByAssetType && sourceNode.type === 'project' && sourceNode.assetTypes && sourceNode.assetTypes.length > 0) {
                            sourceClusterKey = `asset-${sourceNode.assetTypes[0]}`;
                        }
                        
                        // Check if target is clustered
                        let targetClusterKey = null;
                        if (clusterByOrgType && targetNode.type === 'organization' && targetNode.orgType) {
                            targetClusterKey = `org-${targetNode.orgType}`;
                        } else if (clusterByAssetType && targetNode.type === 'project' && targetNode.assetTypes && targetNode.assetTypes.length > 0) {
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
                    
                    if (clusterByOrgType && node.type === 'organization' && node.orgType) {
                        clusterKey = `org-${node.orgType}`;
                    } else if (clusterByAssetType && node.type === 'project' && node.assetTypes && node.assetTypes.length > 0) {
                        clusterKey = `asset-${node.assetTypes[0]}`;
                    }
                    
                    if (clusterKey && clusterCenters.has(clusterKey)) {
                        // Node is clustered - pull toward its cluster center
                        const center = clusterCenters.get(clusterKey)!;
                        const strength = alpha > decayStart 
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
                        
                        connectedClusterKeys.forEach(key => {
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
            
            fg.d3Force('clusterX', null); // Remove old separate X force
            fg.d3Force('clusterY', null); // Remove old separate Y force
        } else {
            // Restore default forces when clustering is off
            fg.d3Force('charge').strength(-400);
            
            // No center force - nodes distribute naturally
            fg.d3Force('center', null);
            
            // Restore standard link strength and distances
            fg.d3Force('link').strength(0.5);
            fg.d3Force('link').distance((link: any) => {
                const sourceType = link.source.type || link.source;
                const targetType = link.target.type || link.target;

                if ((sourceType === 'organization' && targetType === 'project') ||
                    (sourceType === 'project' && targetType === 'organization')) {
                    return 100;
                }

                if ((sourceType === 'organization' && targetType === 'donor') ||
                    (sourceType === 'donor' && targetType === 'organization')) {
                    return 200;
                }

                return 150;
            });
            
            // Restore normal collision force
            fg.d3Force('collision', forceCollide((node: any) => {
                const r = (node.value || 10) / 2;
                const padding = 8;
                return r + padding;
            }).iterations(3).strength(0.8));
        }
        
        // Always reheat to recalculate from current state with new forces
        fg.d3ReheatSimulation();

    }, [clusterByOrgType, clusterByAssetType]); // Only re-run when clustering toggles change

    // Note: persistent click-based highlighting removed to avoid performance issues.

    // Handle node hover to highlight connections
    const handleNodeHover = useCallback((node: GraphNode | null) => {
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
        graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
            const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

            if (sourceId === node.id || targetId === node.id) {
                newHighlightNodes.add(sourceId);
                newHighlightNodes.add(targetId);
                newHighlightLinks.add(`${sourceId}-${targetId}`);
            }
        });

        setHoverHighlightNodes(newHighlightNodes);
        setHoverHighlightLinks(newHighlightLinks);
    }, [graphData]);

    // Handle node click to open modals
    const handleNodeClick = useCallback((node: any) => {
        // The node object from react-force-graph may have additional properties
        // Extract the relevant fields
        const nodeType = node.type;
        const orgKey = node.orgKey;
        const projectKey = node.projectKey;
        
        if (nodeType === 'organization' && orgKey) {
            onOpenOrganizationModal(orgKey);
        } else if (nodeType === 'project' && projectKey) {
            onOpenProjectModal(projectKey);
        }
        // Ignore clicks on donor nodes and cluster hulls
    }, [onOpenOrganizationModal, onOpenProjectModal]);

    // Handle background click to deselect
    const handleBackgroundClick = useCallback(() => {
        // Close modals by clearing selection (calling with empty string)
        if (selectedOrgKey) {
            onOpenOrganizationModal('');
        }
        if (selectedProjectKey) {
            onOpenProjectModal('');
        }
    }, [selectedOrgKey, selectedProjectKey, onOpenOrganizationModal, onOpenProjectModal]);

    // Get brand colors once on mount - memoized to avoid repeated CSS variable lookups
    const themeColors = useMemo(() => {
        const getBrandColor = (varName: string): string => {
            if (typeof window !== 'undefined') {
                const color = getComputedStyle(document.documentElement)
                    .getPropertyValue(varName)
                    .trim();
                return color || '#e6af26';
            }
            return '#e6af26';
        };

        return {
            brandPrimary: getBrandColor('--brand-primary'),
            brandPrimaryDark: getBrandColor('--brand-primary-dark'),
            brandBgLight: getBrandColor('--brand-bg-light'),
            badgeOtherText: getBrandColor('--badge-other-text'),
            badgeSlateBg: getBrandColor('--badge-slate-bg'),
            badgeSlateText: getBrandColor('--badge-slate-text')
        };
    }, []);

    // Custom node canvas rendering - only draw the node circles
    const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        // Use hover-based highlighting only (persistent click-based highlighting removed)
        const isHoverHighlighted = hoverHighlightNodes.size > 0 && hoverHighlightNodes.has(node.id);
        const isHighlighted = isHoverHighlighted;
        const isDimmed = hoverHighlightNodes.size > 0 && !isHighlighted;
        
        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, node.value / 2, 0, 2 * Math.PI, false);
        
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
        if (node.type === 'organization') {
            ctx.strokeStyle = themeColors.brandPrimaryDark;
        } else if (node.type === 'project') {
            ctx.strokeStyle = themeColors.badgeOtherText;
        } else if (node.type === 'donor') {
            // Use the slate/gray badge text color for donor borders to match legend/tables
            ctx.strokeStyle = themeColors.badgeSlateText || '#64748b';
        } else {
            ctx.strokeStyle = '#000';
        }
        ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 1 / globalScale;
        ctx.stroke();
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Draw flag for selected/filtered donor nodes only
        if (node.type === 'donor' && combinedDonors && combinedDonors.length > 0 && combinedDonors.includes(node.name)) {
            const flagUrl = getCountryFlagUrl(node.name);
            if (flagUrl) {
                // Check if flag image is already loaded in cache
                let flagImg = flagImageCache.current.get(flagUrl);

                
                if (!flagImg) {

                    // Create and load the image
                    flagImg = new Image();
                    flagImg.crossOrigin = 'anonymous'; // Enable CORS for flagcdn.com
                    flagImg.src = flagUrl;
                    flagImageCache.current.set(flagUrl, flagImg);
                    
                    // Trigger a redraw when the image loads
                    flagImg.onload = () => {
                        // Increment counter to trigger re-render
                        setFlagLoadCounter(prev => prev + 1);
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
    }, [hoverHighlightNodes, themeColors, flagImageCache, combinedDonors]);

    // Custom label rendering - drawn after all nodes to appear on top
    const paintNodeLabel = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
        const isHoverHighlighted = hoverHighlightNodes.size > 0 && hoverHighlightNodes.has(node.id);
        const isHighlighted = isHoverHighlighted;

        // Draw label if hovered or highlighted
        if ((hoveredNode && hoveredNode.id === node.id) || isHighlighted) {
            const label = node.name;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.fillRect(
                node.x! - bckgDimensions[0] / 2,
                node.y! + node.value / 2 + 2,
                bckgDimensions[0],
                bckgDimensions[1]
            );

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#1e293b';
            ctx.fillText(label, node.x!, node.y! + node.value / 2 + fontSize / 2 + 4);
        }
    }, [hoveredNode, hoverHighlightNodes]);

    // Define the clickable area for nodes (required when using custom nodeCanvasObject)
    const nodePointerAreaPaint = useCallback((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
        // Draw a circle matching the node's size to define the clickable area
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, node.value / 2, 0, 2 * Math.PI, false);
        ctx.fill();
    }, []);

    // Memoize cluster data to avoid recalculating node groupings on every render
    const clusterData = useMemo(() => {
        if (!clusterByOrgType && !clusterByAssetType) return null;

        const clusters = new Map<string, GraphNode[]>();
        
        graphData.nodes.forEach(node => {
            let clusterKey = null;
            
            if (clusterByOrgType && node.type === 'organization' && node.orgType) {
                clusterKey = `org-${node.orgType}`;
            } else if (clusterByAssetType && node.type === 'project' && node.assetTypes && node.assetTypes.length > 0) {
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
    const drawClusters = useCallback((
        ctx: CanvasRenderingContext2D, 
        globalScale: number, 
        drawType: 'hulls' | 'labels'
    ) => {
        if (!clusterData) return;

        clusterData.forEach((nodes, clusterKey) => {
            if (nodes.length < 1) return; // Allow single-node clusters
            
            // Calculate convex hull points with adaptive padding (shared logic)
            const basePadding = 15;
            const padding = Math.max(5, basePadding / globalScale);
            const points = nodes.map(n => ({ x: n.x!, y: n.y!, r: (n.value / 2) + padding }));
            
            if (points.length === 0) return;
            
            // Calculate centroid and radius (shared logic)
            const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
            const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
            const maxDist = Math.max(...points.map(p => 
                Math.sqrt(Math.pow(p.x - centroidX, 2) + Math.pow(p.y - centroidY, 2)) + p.r
            ));
            const extraRadius = Math.max(5, 8 / globalScale);
            
            if (drawType === 'hulls') {
                // Draw cluster background hull
                ctx.beginPath();
                ctx.arc(centroidX, centroidY, maxDist + extraRadius, 0, 2 * Math.PI);
                
                if (clusterKey.startsWith('org-')) {
                    ctx.fillStyle = 'rgba(243, 195, 92, 0.1)';
                    ctx.strokeStyle = 'rgba(188, 132, 15, 0.3)';
                } else {
                    ctx.fillStyle = 'rgba(215, 216, 245, 0.15)';
                    ctx.strokeStyle = 'rgba(77, 71, 156, 0.3)';
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
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const label = clusterKey.replace('org-', '').replace('asset-', '');
                const labelY = centroidY - maxDist - extraRadius - (15 / globalScale);
                
                // Draw label background
                const labelWidth = ctx.measureText(label).width;
                const labelPadding = 6 / globalScale;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(
                    centroidX - labelWidth / 2 - labelPadding,
                    labelY - fontSize / 2 - labelPadding,
                    labelWidth + labelPadding * 2,
                    fontSize + labelPadding * 2
                );
                
                // Draw label text
                ctx.fillStyle = clusterKey.startsWith('org-') ? '#BC840F' : '#4d479c';
                ctx.fillText(label, centroidX, labelY);
            }
        });
    }, [clusterData]);

    return (
        <>
            <div ref={containerRef} className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative">
                {/* Graph Controls - Top Right */}
                <div 
                    className="absolute right-4 z-10 transition-all duration-200"
                    style={{ top: isFullscreen ? `${filterBarHeight + 30}px` : '16px' }}
                >
                    <div className="bg-white backdrop-blur-lg rounded-lg border border-slate-200 shadow-sm p-1.5 flex gap-1">
                        <button
                            onClick={centerView}
                            className="p-1.5 hover:bg-slate-200/50 rounded transition-colors"
                            title="Center view"
                        >
                            <Crosshair className="w-4 h-4 text-slate-600" />
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-1.5 hover:bg-slate-200/50 rounded transition-colors"
                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? (
                                <Minimize className="w-4 h-4 text-slate-600" />
                            ) : (
                                <Maximize className="w-4 h-4 text-slate-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Legend and Clustering Controls - Collapsible */}
                <div 
                    className="absolute left-4 z-10 transition-all duration-200"
                    style={{ top: isFullscreen ? `${filterBarHeight + 30}px` : '16px' }}
                >
                    {legendCollapsed ? (
                        <button
                            onClick={() => setLegendCollapsed(false)}
                            className="p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                            title="Show legend"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-700">
                                <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    ) : (
                        <div className="bg-white backdrop-blur-lg rounded-lg border border-slate-200 shadow-sm w-44">
                            {/* Legend */}
                            <div className="p-2.5 border-b border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-semibold text-slate-800/90">Legend</div>
                                    <button
                                        onClick={() => setLegendCollapsed(true)}
                                        className="p-1 hover:bg-slate-200/50 rounded transition-colors"
                                        title="Hide legend"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-slate-600">
                                            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {combinedDonors && combinedDonors.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: '#94a3b8', border: '1.5px solid #64748b' }}></div>
                                            <span className="text-xs text-slate-600">Selected Donors</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: '#cbd5e1', border: '1.5px solid var(--badge-slate-text)' }}></div>
                                        <span className="text-xs text-slate-600">Donors</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--brand-primary-light)', border: '1.5px solid var(--brand-primary-dark)' }}></div>
                                        <span className="text-xs text-slate-600">Organizations</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--badge-other-bg)', border: '1.5px solid var(--badge-other-text)' }}></div>
                                        <span className="text-xs text-slate-600">Assets</span>
                                    </div>
                                </div>
                            </div>

                            {/* Clustering Controls */}
                            <div className="p-2.5">
                                <div className="text-xs font-semibold text-slate-800/90 mb-2">Clustering</div>
                                <div className="space-y-1.5">
                                    <button
                                        onClick={() => setClusterByOrgType(!clusterByOrgType)}
                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                                            clusterByOrgType
                                                ? 'bg-[var(--brand-bg-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                        title="Group organizations by type"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px]">Org Type</span>
                                            <div className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${
                                                clusterByOrgType ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-slate-300'
                                            }`}>
                                                {clusterByOrgType && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setClusterByAssetType(!clusterByAssetType)}
                                        className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                                            clusterByAssetType
                                                ? 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] border border-[var(--badge-other-text)]'
                                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                        title="Group assets by investment type"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px]">Asset Type</span>
                                            <div className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${
                                                clusterByAssetType ? 'bg-[var(--badge-other-text)] border-[var(--badge-other-text)]' : 'border-slate-300'
                                            }`}>
                                                {clusterByAssetType && (
                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeLabel=""
                nodeVal="value"
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => 'replace'}
                nodePointerAreaPaint={nodePointerAreaPaint}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                onRenderFramePre={(ctx, globalScale) => {
                    // Draw cluster hulls first (behind everything)
                    drawClusters(ctx, globalScale, 'hulls');
                }}
                onRenderFramePost={(ctx, globalScale) => {
                    // Track current zoom level for use in linkWidth callback
                    globalScaleRef.current = globalScale;
                    // Draw all node labels
                    graphData.nodes.forEach(node => paintNodeLabel(node, ctx, globalScale));
                    // Draw cluster labels on top of everything
                    drawClusters(ctx, globalScale, 'labels');
                }}
                linkColor={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    // Hover-based highlights only
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return '#cbd5e1';
                    if (isHoverHighlight) return themeColors.brandPrimary;
                    // Make non-highlighted links more visible when something is highlighted
                    return 'rgba(203, 213, 225, 0.6)';
                }}
                linkWidth={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    // Scale line width with zoom: thicker when zoomed out, thinner when zoomed in
                    const baseWidth = hoverHighlightLinks.size === 0 ? 1 : (isHoverHighlight ? 2 : 1);
                    return baseWidth * globalScaleRef.current * 1.1;
                }}
                linkDirectionalParticles={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return 1;
                    return isHoverHighlight ? 2 : 0;
                }}
                linkDirectionalParticleWidth={(link) => {
                    // Scale particle width with zoom: larger when zoomed out, smaller when zoomed in
                    return 2 * globalScaleRef.current * 1.1;
                }}
                linkDirectionalParticleSpeed={0.005}
                d3VelocityDecay={0.5}
                d3AlphaDecay={0.008}
                cooldownTicks={500}
                warmupTicks={0}
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
        {isFullscreen && filterBarContainer && createPortal(
            <div ref={filterBarRef} className="fixed top-4 left-4 right-4 z-[100] bg-white backdrop-blur-lg p-4 rounded-lg border border-slate-200 shadow-lg">
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
            filterBarContainer
        )}
    </>
    );
};

export default NetworkGraph;