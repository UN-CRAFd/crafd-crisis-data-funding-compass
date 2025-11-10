'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { forceCollide } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize, Minimize, Crosshair, MessageSquare, RotateCcw, AlertCircle } from 'lucide-react';
import type { OrganizationWithProjects } from '../types/airtable';
import FilterBar from './FilterBar';
import { Button } from './ui/button';
import { getCountryFlagUrl } from './CountryFlag';

interface NetworkGraphProps {
    organizationsWithProjects: OrganizationWithProjects[];
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
}

interface GraphNode {
    id: string;
    name: string;
    type: 'donor' | 'organization' | 'project' | 'cluster-hull';
    value: number; // Size of the node
    color: string;
    orgKey?: string;
    projectKey?: string;
    orgType?: string; // For organization clustering
    assetTypes?: string[]; // For project/asset clustering
    clusterKey?: string; // For identifying which cluster this hull belongs to
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
    const [isClusteringTransition, setIsClusteringTransition] = useState(false);
    const lastClusterStateRef = useRef<string>(''); // Track last clustering state to prevent unnecessary updates
    const [filterBarContainer, setFilterBarContainer] = useState<HTMLElement | null>(null);
    const lastFiltersRef = useRef<string>(''); // Track filter state to detect changes
    
    // Cache for country flag images
    const flagImageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [, setFlagLoadCounter] = useState(0); // Counter to trigger re-render when flags load

    // Turn off clustering when filters change
    useEffect(() => {
        const currentFilters = JSON.stringify({
            donors: combinedDonors,
            types: investmentTypes,
            search: appliedSearchQuery
        });
        
        // If filters have changed (and this isn't the initial mount)
        if (lastFiltersRef.current && lastFiltersRef.current !== currentFilters) {
            setClusterByOrgType(false);
            setClusterByAssetType(false);
        }
        
        lastFiltersRef.current = currentFilters;
    }, [combinedDonors, investmentTypes, appliedSearchQuery]);

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
        donorSet.forEach(donor => {
            // Use darker color if this donor is in the filter
            const isFiltered = combinedDonors && combinedDonors.length > 0 && combinedDonors.includes(donor);
            
            nodes.push({
                id: `donor-${donor}`,
                name: donor,
                type: 'donor',
                value: 25, // Larger nodes for donors
                color: isFiltered ? selectedDonorColor : badgeSlateBg, // Medium gray for filtered donors
            });
        });

        // Add organization and project nodes
        organizationsWithProjects.forEach(org => {
            const orgNodeId = `org-${org.id}`;
            
            // Add organization node - medium, using amber/golden badge color (like ACAPS badge)
            nodes.push({
                id: orgNodeId,
                name: org.organizationName,
                type: 'organization',
                value: 22, // Medium nodes for organizations
                color: brandBgLight, // Uses --brand-bg-light (amber/golden from organization badges)
                orgKey: org.orgShortName, // Use orgShortName for modal/URL
                orgType: org.type, // Store org type for clustering
            });

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
                    nodes.push({
                        id: projectNodeId,
                        name: project.projectName,
                        type: 'project',
                        value: 20, // Slightly larger nodes for projects (assets)
                        color: badgeOtherBg, // Uses --badge-other-bg (purple/indigo from asset type badges)
                        projectKey: project.productKey, // Use productKey for modal/URL
                        assetTypes: project.investmentTypes || [], // Store asset types for clustering
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

        // Weaker centering force for less aggressive pulling
        fg.d3Force('center').strength(0.02);

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
    }, []); // Only run once on mount, not on every graphData change

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
            fg.d3Force('charge').strength(-300); // Much stronger repulsion between clusters
            fg.d3Force('center').strength(0.001); // Almost no centering
            fg.d3Force('link').strength(0.1); // Very weak links
            
            // More collision within clusters to prevent overlap
            fg.d3Force('collision', forceCollide((node: any) => {
                const r = (node.value || 10) / 2;
                const padding = 6; // More padding to spread nodes within cluster
                return r + padding;
            }).iterations(2).strength(0.7)); // Stronger collision force
            
            const clusterCenters = new Map<string, { x: number; y: number }>();
            // Make clusters much more spread out
            const clusterRadius = Math.min(dimensions.width, dimensions.height) * 0.45;
            
            // Collect unique cluster keys
            const clusterKeys = new Set<string>();
            const clusterNodeCounts = new Map<string, number>();
            
            graphData.nodes.forEach(node => {
                let clusterKey = null;
                
                if (clusterByOrgType && node.type === 'organization' && node.orgType) {
                    clusterKey = `org-${node.orgType}`;
                } else if (clusterByAssetType && node.type === 'project' && node.assetTypes && node.assetTypes.length > 0) {
                    clusterKey = `asset-${node.assetTypes[0]}`;
                }
                
                if (clusterKey) {
                    clusterKeys.add(clusterKey);
                    clusterNodeCounts.set(clusterKey, (clusterNodeCounts.get(clusterKey) || 0) + 1);
                }
            });
            
            // Assign well-separated positions for each cluster center
            const clusterArray = Array.from(clusterKeys);
            const numClusters = clusterArray.length;
            
            clusterArray.forEach((key, i) => {
                // Arrange clusters in a grid or circular pattern with large spacing
                if (numClusters <= 4) {
                    // Use corners for up to 4 clusters
                    const positions = [
                        { x: -clusterRadius, y: -clusterRadius },
                        { x: clusterRadius, y: -clusterRadius },
                        { x: -clusterRadius, y: clusterRadius },
                        { x: clusterRadius, y: clusterRadius }
                    ];
                    clusterCenters.set(key, positions[i]);
                } else {
                    // Use circle arrangement for more clusters
                    const angle = (i / numClusters) * 2 * Math.PI;
                    clusterCenters.set(key, {
                        x: Math.cos(angle) * clusterRadius,
                        y: Math.sin(angle) * clusterRadius
                    });
                }
            });
            
            // Very strong clustering force that stays strong for a long time
            const baseClusterStrength = 0.5; // Very strong pull
            const decayStart = 0.7; // Start decaying very late
            
            // Add repulsion between cluster centers to keep them separated
            fg.d3Force('clusterRepulsion', (alpha: number) => {
                const clusterArray = Array.from(clusterCenters.entries());
                const hullRepulsionStrength = 50000; // Strong repulsion between cluster hulls
                
                // Apply repulsion between each pair of cluster centers
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
                        const center = clusterCenters.get(clusterKey)!;
                        const strength = alpha > decayStart 
                            ? baseClusterStrength 
                            : baseClusterStrength * Math.pow(alpha / decayStart, 0.5);
                        node.vx += (center.x - node.x) * strength;
                        node.vy += (center.y - node.y) * strength;
                    }
                }
            });
            
            fg.d3Force('clusterX', null); // Remove old separate X force
            fg.d3Force('clusterY', null); // Remove old separate Y force
        } else {
            // Restore calmer default forces when clustering is off
            fg.d3Force('charge').strength(-400);
            fg.d3Force('center').strength(0.02);
            fg.d3Force('link').strength(0.5); // Restore link strength
            
            // Restore normal collision force
            fg.d3Force('collision', forceCollide((node: any) => {
                const r = (node.value || 10) / 2;
                const padding = 8;
                return r + padding;
            }).iterations(3).strength(0.8));
        }
        
        // Always reheat to recalculate from current state with new forces
        fg.d3ReheatSimulation();

        // Set transition flag and reset after a delay
        setIsClusteringTransition(true);
        const timer = setTimeout(() => {
            setIsClusteringTransition(false);
        }, 3000); // Longer delay for full cluster resolution

        return () => clearTimeout(timer);
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
        // Skip rendering cluster hull nodes (invisible anchors)
        if (node.type === 'cluster-hull') return;
        
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
            ctx.strokeStyle = themeColors.badgeSlateText;
        } else {
            ctx.strokeStyle = '#000';
        }
        ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 1 / globalScale;
        ctx.stroke();
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Draw flag for selected/filtered donor nodes only
        if (node.type === 'donor' && node.name && combinedDonors.length > 0 && combinedDonors.includes(node.name)) {
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
                {/* Legend and Clustering Controls - Collapsible */}
                <div className={`absolute ${isFullscreen ? 'top-24' : 'top-4'} left-4 z-10`}>
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
                                    <div className="flex gap-1 items-center">
                                        <button
                                            onClick={centerView}
                                            className="p-1 hover:bg-slate-200/50 rounded transition-colors"
                                            title="Center view"
                                        >
                                            <Crosshair className="w-3.5 h-3.5 text-slate-600" />
                                        </button>
                                        <button
                                            onClick={toggleFullscreen}
                                            className="p-1 hover:bg-slate-200/50 rounded transition-colors"
                                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                        >
                                            {isFullscreen ? (
                                                <Minimize className="w-3.5 h-3.5 text-slate-600" />
                                            ) : (
                                                <Maximize className="w-3.5 h-3.5 text-slate-600" />
                                            )}
                                        </button>
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
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/95 backdrop-blur-sm z-[100]">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center p-6">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                <AlertCircle className="w-6 h-6 text-slate-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 mb-2">
                                No Results Found
                            </h3>
                            <p className="text-sm text-slate-600 mb-4">
                                No data matches your current filters. Try adjusting your criteria or reset all filters.
                            </p>
                            <div className="flex flex-col gap-2 w-full">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (onResetFilters) {
                                            onResetFilters();
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 w-full"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Reset Filters
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => window.open('https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form', '_blank')}
                                    className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white w-full"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Send Feedback
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* Filter Bar Portal - render outside overflow-hidden container when in fullscreen */}
        {isFullscreen && filterBarContainer && createPortal(
            <div className="fixed top-4 left-4 right-4 z-[9900] bg-white backdrop-blur-lg p-4 rounded-lg border border-slate-200 shadow-lg">
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
