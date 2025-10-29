'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
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
    const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
    const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());

    // Update dimensions on resize
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                const height = Math.max(600, window.innerHeight - 400);
                setDimensions({ width, height });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

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
                value: 18, // Medium nodes for organizations
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
                    value: 10, // Smaller nodes for projects
                    color: '#4CAF50', // Green for projects
                    projectKey: project.id,
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
        }
    }, [graphData]);

    // Update highlighted nodes and links when a modal is open
    useEffect(() => {
        const newHighlightNodes = new Set<string>();
        const newHighlightLinks = new Set<string>();

        if (selectedOrgKey) {
            const orgNodeId = `org-${selectedOrgKey}`;
            newHighlightNodes.add(orgNodeId);

            // Find all connections for this organization
            graphData.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

                if (sourceId === orgNodeId || targetId === orgNodeId) {
                    newHighlightNodes.add(sourceId);
                    newHighlightNodes.add(targetId);
                    newHighlightLinks.add(`${sourceId}-${targetId}`);
                }
            });
        } else if (selectedProjectKey) {
            const projectNodeId = `project-${selectedProjectKey}`;
            newHighlightNodes.add(projectNodeId);

            // Find all connections for this project
            graphData.links.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

                if (sourceId === projectNodeId || targetId === projectNodeId) {
                    newHighlightNodes.add(sourceId);
                    newHighlightNodes.add(targetId);
                    newHighlightLinks.add(`${sourceId}-${targetId}`);
                }
            });
        }

        setHighlightNodes(newHighlightNodes);
        setHighlightLinks(newHighlightLinks);
    }, [selectedOrgKey, selectedProjectKey, graphData]);

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

    // Custom node canvas rendering
    const paintNode = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
        const isHighlighted = highlightNodes.size > 0 && highlightNodes.has(node.id);
        const isDimmed = highlightNodes.size > 0 && !isHighlighted;
        
        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, node.value / 2, 0, 2 * Math.PI, false);
        
        // Apply dimming or highlighting
        if (isDimmed) {
            ctx.globalAlpha = 0.2;
        } else if (isHighlighted) {
            ctx.globalAlpha = 1;
            // Add glow effect for highlighted nodes
            ctx.shadowColor = node.color;
            ctx.shadowBlur = 15;
        }
        
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Add border for clickable nodes
        if (node.type === 'organization' || node.type === 'project') {
            ctx.strokeStyle = isHighlighted ? '#fff' : '#fff';
            ctx.lineWidth = isHighlighted ? 3 / globalScale : 2 / globalScale;
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
    }, [hoveredNode, highlightNodes]);

    return (
        <div ref={containerRef} className="w-full h-full bg-white rounded-lg border border-slate-200 overflow-hidden relative">
            {/* Legend */}
            <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-xs font-semibold text-slate-700 mb-2">Legend</div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#e6af26' }}></div>
                        <span className="text-xs text-slate-600">Donors</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1FBBEE' }}></div>
                        <span className="text-xs text-slate-600">Organizations (clickable)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4CAF50' }}></div>
                        <span className="text-xs text-slate-600">Assets (clickable)</span>
                    </div>
                </div>
                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                    Click to open • Connections highlighted • Hover for labels
                </div>
            </div>

            <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeLabel="name"
                nodeVal="value"
                nodeCanvasObject={paintNode}
                onNodeClick={handleNodeClick}
                onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
                linkColor={(link) => {
                    if (highlightLinks.size === 0) return '#cbd5e1';
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    return highlightLinks.has(linkId) ? '#e6af26' : 'rgba(203, 213, 225, 0.2)';
                }}
                linkWidth={(link) => {
                    if (highlightLinks.size === 0) return 1;
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    return highlightLinks.has(linkId) ? 3 : 1;
                }}
                linkDirectionalParticles={(link) => {
                    if (highlightLinks.size === 0) return 2;
                    const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    const linkId = `${sourceId}-${targetId}`;
                    return highlightLinks.has(linkId) ? 4 : 0;
                }}
                linkDirectionalParticleWidth={3}
                linkDirectionalParticleSpeed={0.005}
                d3VelocityDecay={0.2}
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
