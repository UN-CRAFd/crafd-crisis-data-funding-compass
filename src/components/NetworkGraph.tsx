'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { forceCollide } from 'd3-force';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize, Minimize } from 'lucide-react';
import type { OrganizationWithProjects } from '../types/airtable';

interface NetworkGraphProps {
    organizationsWithProjects: OrganizationWithProjects[];
    onOpenOrganizationModal: (orgKey: string) => void;
    onOpenProjectModal: (projectKey: string) => void;
    selectedOrgKey?: string;
    selectedProjectKey?: string;
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
    onOpenOrganizationModal,
    onOpenProjectModal,
    selectedOrgKey,
    selectedProjectKey,
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
    const [isClusteringTransition, setIsClusteringTransition] = useState(false);

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

    // Listen for fullscreen changes (e.g., user presses ESC)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
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

        // Add donor nodes - largest, using slate colors (like in tables)
        donorSet.forEach(donor => {
            nodes.push({
                id: `donor-${donor}`,
                name: donor,
                type: 'donor',
                value: 25, // Larger nodes for donors
                color: badgeSlateBg, // Use badge slate color
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
                orgKey: org.id,
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
                        projectKey: project.id,
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
        console.log(`[NetworkGraph] Graph data computed in ${(endTime - startTime).toFixed(2)}ms (${nodes.length} nodes, ${links.length} links)`);

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
        console.log(`[NetworkGraph] Force simulation configured in ${(endTime - startTime).toFixed(2)}ms`);
    }, []); // Only run once on mount, not on every graphData change

    // Apply clustering with smooth transitions and collision avoidance
    useEffect(() => {
        if (!graphRef.current) return;
        
        const fg = graphRef.current;
        
        // Remove any existing cluster forces first
        fg.d3Force('clusterX', null);
        fg.d3Force('clusterY', null);
        
        if (clusterByOrgType || clusterByAssetType) {
            // Dramatically weaken all competing forces during clustering
            fg.d3Force('charge').strength(-50); // Very weak repulsion
            fg.d3Force('center').strength(0.001); // Almost no centering
            fg.d3Force('link').strength(0.1); // Very weak links
            
            // Minimal collision - let nodes pack tightly
            fg.d3Force('collision', forceCollide((node: any) => {
                const r = (node.value || 10) / 2;
                const padding = 2; // Barely any padding
                return r + padding;
            }).iterations(1).strength(0.3)); // Minimal collision force
            
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
            
            fg.d3Force('clusterX', (alpha: number) => {
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
                        // Keep very strong until very late, then decay
                        const strength = alpha > decayStart 
                            ? baseClusterStrength 
                            : baseClusterStrength * Math.pow(alpha / decayStart, 0.5);
                        node.vx += (center.x - node.x) * strength;
                    }
                }
            });
            
            fg.d3Force('clusterY', (alpha: number) => {
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
                        // Keep very strong until very late, then decay
                        const strength = alpha > decayStart 
                            ? baseClusterStrength 
                            : baseClusterStrength * Math.pow(alpha / decayStart, 0.5);
                        node.vy += (center.y - node.y) * strength;
                    }
                }
            });
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
    }, [graphData, clusterByOrgType, clusterByAssetType, dimensions]);

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

    // Handle node click
    // NOTE: organization and project nodes should not be clickable per UX request.
    // We ignore clicks on those node types. Keep the handler so it can be extended
    // later if donor-click behavior is added.
  

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

    // Get brand color at runtime for use in link highlighting
    const getBrandColor = useCallback((varName: string): string => {
        if (typeof window !== 'undefined') {
            const color = getComputedStyle(document.documentElement)
                .getPropertyValue(varName)
                .trim();
            return color || '#e6af26';
        }
        return '#e6af26';
    }, []);

    const brandPrimaryColor = getBrandColor('--brand-primary');
    const brandPrimaryDarkColor = getBrandColor('--brand-primary-dark');
    const brandBgLightColor = getBrandColor('--brand-bg-light');
    const badgeOtherTextColor = getBrandColor('--badge-other-text');
    const badgeSlateBgColor = getBrandColor('--badge-slate-bg');
    const badgeSlateTextColor = getBrandColor('--badge-slate-text');

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
            ctx.strokeStyle = brandPrimaryDarkColor;
        } else if (node.type === 'project') {
            ctx.strokeStyle = badgeOtherTextColor;
        } else if (node.type === 'donor') {
            ctx.strokeStyle = badgeSlateTextColor;
        } else {
            ctx.strokeStyle = '#000';
        }
    ctx.lineWidth = isHighlighted ? 1.5 / globalScale : 1 / globalScale;
        ctx.stroke();
        
        // Reset alpha
        ctx.globalAlpha = 1;
    }, [hoverHighlightNodes, brandPrimaryDarkColor, badgeOtherTextColor, badgeSlateTextColor]);

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

    // Draw cluster hulls around grouped nodes (backgrounds only)
    const drawClusterHulls = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!clusterByOrgType && !clusterByAssetType) return;

        // Group nodes by cluster
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

        // Draw hull for each cluster (without labels)
        clusters.forEach((nodes, clusterKey) => {
            if (nodes.length < 2) return; // Need at least 2 nodes for a hull
            
            // Calculate convex hull points with padding
            const padding = 20 / globalScale;
            const points = nodes.map(n => ({ x: n.x!, y: n.y!, r: (n.value / 2) + padding }));
            
            // Simple hull: find bounding circle
            if (points.length > 0) {
                const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
                const maxDist = Math.max(...points.map(p => 
                    Math.sqrt(Math.pow(p.x - centroidX, 2) + Math.pow(p.y - centroidY, 2)) + p.r
                ));
                
                // Draw cluster background
                ctx.beginPath();
                ctx.arc(centroidX, centroidY, maxDist + 10 / globalScale, 0, 2 * Math.PI);
                
                // Style based on cluster type
                if (clusterKey.startsWith('org-')) {
                    ctx.fillStyle = 'rgba(243, 195, 92, 0.1)'; // Amber with low opacity
                    ctx.strokeStyle = 'rgba(188, 132, 15, 0.3)'; // Amber dark
                } else {
                    ctx.fillStyle = 'rgba(215, 216, 245, 0.15)'; // Purple/indigo with low opacity
                    ctx.strokeStyle = 'rgba(77, 71, 156, 0.3)'; // Purple dark
                }
                
                ctx.lineWidth = 2 / globalScale;
                ctx.setLineDash([5 / globalScale, 5 / globalScale]);
                ctx.fill();
                ctx.stroke();
                ctx.setLineDash([]); // Reset dash
            }
        });
    }, [graphData, clusterByOrgType, clusterByAssetType]);

    // Draw cluster labels on top of everything
    const drawClusterLabels = useCallback((ctx: CanvasRenderingContext2D, globalScale: number) => {
        if (!clusterByOrgType && !clusterByAssetType) return;

        // Group nodes by cluster
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

        // Draw labels for each cluster
        clusters.forEach((nodes, clusterKey) => {
            if (nodes.length < 2) return;
            
            const padding = 20 / globalScale;
            const points = nodes.map(n => ({ x: n.x!, y: n.y!, r: (n.value / 2) + padding }));
            
            if (points.length > 0) {
                const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
                const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
                const maxDist = Math.max(...points.map(p => 
                    Math.sqrt(Math.pow(p.x - centroidX, 2) + Math.pow(p.y - centroidY, 2)) + p.r
                ));
                
                // Draw cluster label
                const fontSize = 14 / globalScale;
                ctx.font = `bold ${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Extract readable label from cluster key
                const label = clusterKey.replace('org-', '').replace('asset-', '');
                const labelY = centroidY - maxDist - 20 / globalScale;
                
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
                if (clusterKey.startsWith('org-')) {
                    ctx.fillStyle = '#BC840F';
                } else {
                    ctx.fillStyle = '#4d479c';
                }
                ctx.fillText(label, centroidX, labelY);
            }
        });
    }, [graphData, clusterByOrgType, clusterByAssetType]);

    return (
        <div ref={containerRef} className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative">
            {/* Legend */}
            <div className="absolute top-4 left-4 z-10 bg-white backdrop-blur-lg p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-800/90">Legend</div>
                    <button
                        onClick={toggleFullscreen}
                        className="ml-4 p-1 hover:bg-slate-200/50 rounded transition-colors"
                        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    >
                        {isFullscreen ? (
                            <Minimize className="w-3.5 h-3.5 text-slate-600" />
                        ) : (
                            <Maximize className="w-3.5 h-3.5 text-slate-600" />
                        )}
                    </button>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#cbd5e1', border: '1.5px solid var(--badge-slate-text)' }}></div>
                        <span className="text-xs text-slate-600">Donors</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--brand-primary-light)', border: '1.5px solid var(--brand-primary-dark)' }}></div>
                        <span className="text-xs text-slate-600">Organizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--badge-other-bg)', border: '1.5px solid var(--badge-other-text)' }}></div>
                        <span className="text-xs text-slate-600">Assets</span>
                    </div>
                </div>
                
            </div>

            {/* Clustering Controls */}
            <div className="absolute top-4 right-4 z-10 bg-white backdrop-blur-lg p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-800/90 mb-2">Clustering</div>
                <div className="space-y-2">
                    <button
                        onClick={() => setClusterByOrgType(!clusterByOrgType)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            clusterByOrgType
                                ? 'bg-[var(--brand-bg-light)] text-[var(--brand-primary)] border border-[var(--brand-primary)]'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Group organizations by type"
                    >
                        <div className="flex items-center justify-between">
                            <span>By Org Type</span>
                            <div className={`w-3 h-3 rounded-sm border ${
                                clusterByOrgType ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'border-slate-300'
                            }`}>
                                {clusterByOrgType && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => setClusterByAssetType(!clusterByAssetType)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                            clusterByAssetType
                                ? 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] border border-[var(--badge-other-text)]'
                                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Group assets by investment type"
                    >
                        <div className="flex items-center justify-between">
                            <span>By Asset Type</span>
                            <div className={`w-3 h-3 rounded-sm border ${
                                clusterByAssetType ? 'bg-[var(--badge-other-text)] border-[var(--badge-other-text)]' : 'border-slate-300'
                            }`}>
                                {clusterByAssetType && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </button>
                </div>
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
                onBackgroundClick={handleBackgroundClick}
                onRenderFramePre={(ctx, globalScale) => {
                    // Draw cluster hulls first (behind everything)
                    drawClusterHulls(ctx, globalScale);
                }}
                onRenderFramePost={(ctx, globalScale) => {
                    // Track current zoom level for use in linkWidth callback
                    globalScaleRef.current = globalScale;
                    // Draw all node labels
                    graphData.nodes.forEach(node => paintNodeLabel(node, ctx, globalScale));
                    // Draw cluster labels on top of everything
                    drawClusterLabels(ctx, globalScale);
                }}
                linkColor={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    // Hover-based highlights only
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return '#cbd5e1';
                    if (isHoverHighlight) return brandPrimaryColor;
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
        </div>
    );
};

export default NetworkGraph;
