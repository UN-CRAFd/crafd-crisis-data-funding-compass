'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Maximize2, Minimize2 } from 'lucide-react';
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
    x?: number;
    y?: number;
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

    // Update dimensions on resize (reusable)
    const updateDimensions = useCallback(() => {
        if (containerRef.current) {
            const width = containerRef.current.offsetWidth;
            const height = Math.max(600, window.innerHeight - 400);
            setDimensions({ width, height });
        }
    }, []);

    useEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [updateDimensions]);

    // Keep dimensions updated when entering/exiting fullscreen
    useEffect(() => {
        const onFsChange = () => {
            const isFs = !!document.fullscreenElement;
            setIsFullscreen(isFs);
            // Wait a tick for layout to update
            setTimeout(updateDimensions, 50);
        };

        document.addEventListener('fullscreenchange', onFsChange);
        return () => document.removeEventListener('fullscreenchange', onFsChange);
    }, [updateDimensions]);

    // Transform data into graph format
    const graphData = React.useMemo<GraphData>(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const donorSet = new Set<string>();

        // Collect all unique donors first
        organizationsWithProjects.forEach(org => {
            org.donorCountries.forEach(donor => donorSet.add(donor));
        });

        // Add donor nodes - larger, amber color
        donorSet.forEach(donor => {
            nodes.push({
                id: `donor-${donor}`,
                name: donor,
                type: 'donor',
                value: 25, // Larger nodes for donors
                color: '#e6af26', // --brand-primary
            });
        });

        // Add organization and project nodes
        organizationsWithProjects.forEach(org => {
            const orgNodeId = `org-${org.id}`;
            
            // Add organization node - medium, blue color
            nodes.push({
                id: orgNodeId,
                name: org.organizationName,
                type: 'organization',
                value: 22, // Medium nodes for organizations
                color: '#1FBBEE', // Blue for organizations
                orgKey: org.id,
            });

            // Link organizations to donors
            org.donorCountries.forEach(donor => {
                links.push({
                    source: `donor-${donor}`,
                    target: orgNodeId,
                    value: 2,
                });
            });

            // Add project nodes and link to organizations - smaller, green color
            org.projects.forEach(project => {
                const projectNodeId = `project-${project.id}`;
                
                nodes.push({
                    id: projectNodeId,
                    name: project.projectName,
                    type: 'project',
                    value: 20, // Slightly larger nodes for projects (assets)
                    color: '#4CAF50', // Green for projects
                    projectKey: project.productKey,
                });

                links.push({
                    source: orgNodeId,
                    target: projectNodeId,
                    value: 1,
                });
            });
        });

        return { nodes, links };
    }, [organizationsWithProjects]);

    // Configure force simulation for better spacing
    useEffect(() => {
        if (graphRef.current) {
            const fg = graphRef.current;
            
            // Increase repulsion between nodes for better spacing
            fg.d3Force('charge').strength(-400);
            fg.d3Force('charge').distanceMax(500);
            
            // Set link distance for more spread
            fg.d3Force('link').distance(150);
            
            // Weaker centering force
            fg.d3Force('center').strength(0.05);
            
            // Increase velocity decay to make it less wobbly (higher = more damping)
            fg.d3Force('simulation')?.velocityDecay(0.6);
        }
    }, [graphData]);

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
    const handleNodeClick = useCallback((node: GraphNode) => {
        // Pause the simulation to prevent movement
        if (graphRef.current) {
            graphRef.current.pauseAnimation();
        }

        if (node.type === 'organization' && node.orgKey) {
            onOpenOrganizationModal(node.orgKey);
        } else if (node.type === 'project' && node.projectKey) {
            onOpenProjectModal(node.projectKey);
        }

        // Resume animation after a short delay
        setTimeout(() => {
            if (graphRef.current) {
                graphRef.current.resumeAnimation();
            }
        }, 100);
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

    // Fullscreen controls
    const enterFullscreen = useCallback(() => {
        if (containerRef.current && (containerRef.current as any).requestFullscreen) {
            (containerRef.current as any).requestFullscreen();
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen();
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) exitFullscreen(); else enterFullscreen();
    }, [enterFullscreen, exitFullscreen]);

    // Custom node canvas rendering
    const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
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
        
        // Add border for clickable nodes
        if (node.type === 'organization' || node.type === 'project') {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = isHighlighted ? 2.5 / globalScale : 1.5 / globalScale;
            ctx.stroke();
        }
        
        // Reset alpha
        ctx.globalAlpha = 1;

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

    return (
        <div ref={containerRef} className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative">
            {/* Legend */}
            <div className="w-50 absolute top-4 left-4 z-10 bg-white/30 backdrop-blur-lg p-3 rounded-lg border border-slate-200 shadow-sm relative">
                <button
                    onClick={toggleFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-md bg-white/80 hover:bg-white text-slate-700 border border-slate-200"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <div className="text-xs font-semibold text-slate-800/90 mb-2">Legend</div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#e6af26' }}></div>
                        <span className="text-xs text-slate-600">Donors</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1FBBEE' }}></div>
                        <span className="text-xs text-slate-600">Organizations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span className="text-xs text-slate-600">Assets</span>
                    </div>
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
                onNodeClick={handleNodeClick}
                onNodeHover={handleNodeHover}
                onBackgroundClick={handleBackgroundClick}
                linkColor={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    // Hover-based highlights only
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return '#cbd5e1';
                    if (isHoverHighlight) return '#e6af26';
                    // Make non-highlighted links more visible when something is highlighted
                    return 'rgba(203, 213, 225, 0.6)';
                }}
                linkWidth={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return 1;
                    return isHoverHighlight ? 2 : 1;
                }}
                linkDirectionalParticles={(link) => {
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    
                    const isHoverHighlight = hoverHighlightLinks.size > 0 && hoverHighlightLinks.has(linkId);
                    
                    if (hoverHighlightLinks.size === 0) return 1;
                    return isHoverHighlight ? 2 : 0;
                }}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                d3VelocityDecay={0.6}
                d3AlphaDecay={0.01}
                d3AlphaMin={0.001}
                cooldownTicks={200}
                warmupTicks={100}
                enableNodeDrag={true}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                nodeRelSize={6}
            />
        </div>
    );
};

export default NetworkGraph;
