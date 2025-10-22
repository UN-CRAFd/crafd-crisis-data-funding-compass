'use client';

import React, { useEffect, useState } from 'react';
// Image import removed because it's not used in this file
import ChartCard from '@/components/ChartCard';
import OrganizationModal from '@/components/OrganizationModal';
import ProjectModal from '@/components/ProjectModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip as TooltipUI } from '@/components/ui/tooltip';
import labels from '@/config/labels.json';
import type { DashboardStats, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectData, ProjectTypeData } from '../types/airtable';
import { calculateOrganizationTypesFromOrganizationsWithProjects } from '../lib/data';
import { exportDashboardToPDF } from '../lib/exportPDF';
import { Building2, ChevronDown, ChevronRight, Database, DatabaseBackup, FileDown, Filter, FolderDot, FolderOpenDot, Globe, Info, MessageCircle, RotateCcw, Search, Share2 } from 'lucide-react';
import organizationsTableRaw from '../../public/data/organizations-table.json';

// Consolidated style constants
const STYLES = {
    // Card styles
    statCard: "!border-0 transition-all duration-300 hover:ring-2 hover:ring-slate-300/50",
    cardGlass: "!border-0 bg-white/80 backdrop-blur-sm",
    cardGlassLight: "!border-0 bg-white/70 backdrop-blur-sm p-1 rounded-md shadow-none",

    // Typography - Unified section headers
    sectionHeader: "flex items-center gap-2 text-lg font-qanelas-subtitle font-black text-slate-800 mb-0 mt-0 uppercase",
    statValue: "text-5xl font-bold font-mono bg-clip-text text-transparent leading-none tabular-nums",
    statLabel: "text-base font-medium mt-1",
    sectionLabel: "text-xs font-medium text-slate-600 mb-0",

    // Badges
    badgeBase: "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",

    // Interactive elements
    projectItem: "p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors duration-200 animate-in fade-in group",
    orgRow: "flex items-center justify-between p-4 hover:bg-slate-50/70 rounded-lg border border-slate-200 bg-slate-50/30 animate-in fade-in",

    // Chart config
    chartTooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // semi-transparent white
        backdropFilter: 'blur(12px)',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        fontSize: '12px',
        padding: '8px',
        lineHeight: '0.8',
    }
} as const;

interface CrisisDataDashboardProps {
    dashboardData: {
        stats: DashboardStats;
        projectTypes: ProjectTypeData[];
        organizationTypes: OrganizationTypeData[];
        organizationProjects: OrganizationProjectData[];
        organizationsWithProjects: OrganizationWithProjects[];
        allOrganizations: OrganizationWithProjects[]; // Add unfiltered organizations
        donorCountries: string[];
        investmentTypes: string[];
    } | null;
    loading: boolean;
    error: string | null;
    combinedDonors: string[];
    investmentTypes: string[];
    searchQuery: string;
    onDonorsChange: (values: string[]) => void;
    onTypesChange: (values: string[]) => void;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    onResetFilters: () => void;
    logoutButton?: React.ReactNode;
}

// Reusable SectionHeader component
interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
}

const SectionHeader = ({ icon, title }: SectionHeaderProps) => (
    <div className={STYLES.sectionHeader}>
        <span className="h-6 w-6 flex items-center justify-center">
            {icon}
        </span>
        {title}
    </div>
);

// Reusable StatCard component
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    label: string;
    colorScheme: 'amber';
    tooltip?: string;
}

const StatCard = React.memo(function StatCard({ icon, title, value, label, colorScheme, tooltip }: StatCardProps) {
    const gradients = {
        amber: {
            bg: 'from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]',
            value: 'from-[var(--brand-primary)] to-[var(--brand-primary-dark)]',
            label: 'text-[var(--brand-primary)]'
        }
    };

    const colors = gradients[colorScheme];

    const cardContent = (
        <Card className={`${STYLES.statCard} bg-gradient-to-br ${colors.bg}`}>
            <CardHeader className="pb-0 h-5">
                <CardDescription>
                    <SectionHeader icon={icon} title={title} />
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div
                    className={`${STYLES.statValue} bg-gradient-to-r ${colors.value}`}
                >
                    {value}
                </div>
                <div className={`${STYLES.statLabel} ${colors.label}`}>{label}</div>
            </CardContent>
        </Card>
    );

    if (tooltip) {
        return (
            <TooltipProvider delayDuration={0}>
                <TooltipUI>
                    <TooltipTrigger asChild>
                        {cardContent}
                    </TooltipTrigger>
                    <TooltipContent
                        side="bottom"
                        align="center"
                        className="animate-none max-w-100 p-3 bg-white text-slate-800 text-sm rounded-lg border border-slate-200"
                        sideOffset={5}
                        avoidCollisions={true}
                        style={{ ...STYLES.chartTooltip }}
                    >
                        <p className="leading-relaxed">{tooltip}</p>
                    </TooltipContent>
                </TooltipUI>
            </TooltipProvider>
        );
    }

    return cardContent;
});
StatCard.displayName = 'StatCard';

// Reusable Badge component
interface BadgeProps {
    text: string;
    variant: 'blue' | 'emerald' | 'violet' | 'slate' | 'highlighted' | 'beta' | 'types' | 'indigo';
}

const Badge = ({ text, variant }: BadgeProps) => {
    const variants = {
        blue: 'bg-[var(--brand-bg-light)] text-[var(--brand-primary-dark)]',
        emerald: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700',
        indigo: 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] font-semibold',
        types: 'bg-green-50 text-green-700',
        slate: 'bg-slate-100 text-slate-600',
        highlighted: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-border)] font-semibold',
        beta: '' // Will use inline styles
    };

    // Beta variant uses inline styles for CSS variables
    if (variant === 'beta') {
        return (
            <span
                className={`${STYLES.badgeBase} font-semibold`}
                style={{
                    backgroundColor: 'var(--badge-beta-bg)',
                    color: 'var(--badge-beta-text)'
                }}
            >
                {text}
            </span>
        );
    }

    return (
        <span className={`${STYLES.badgeBase} ${variants[variant]}`}>
            {text}
        </span>
    );
};

const CrisisDataDashboard = ({
    dashboardData,
    loading,
    error,
    combinedDonors,
    investmentTypes,
    searchQuery,
    onDonorsChange,
    onTypesChange,
    onSearchChange,
    onSearchSubmit,
    onResetFilters,
    logoutButton
}: CrisisDataDashboardProps) => {
    // UI state (not related to routing)
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
    const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

    // Project modal state
    const [selectedProject, setSelectedProject] = useState<{ project: ProjectData; organizationName: string } | null>(null);
    const [projectModalLoading] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithProjects | null>(null);
    // Load static organizations table for modal details
    const organizationsTable: Array<{ id: string; createdTime?: string; fields: Record<string, unknown> }> = organizationsTableRaw as any;

    // Listen for modal close events dispatched from client modal components (avoids passing functions as props)
    useEffect(() => {
        const onCloseProject = () => setSelectedProject(null);
        const onCloseOrg = () => setSelectedOrganization(null);
        const onOpenOrg = (event: CustomEvent) => {
            const org = event.detail?.organization;
            if (org) {
                // Close the project modal when opening an organization modal
                setSelectedProject(null);
                setSelectedOrganization(org);
            }
        };
        
        window.addEventListener('closeProjectModal', onCloseProject as EventListener);
        window.addEventListener('closeOrganizationModal', onCloseOrg as EventListener);
        window.addEventListener('openOrganizationModal', onOpenOrg as EventListener);
        
        return () => {
            window.removeEventListener('closeProjectModal', onCloseProject as EventListener);
            window.removeEventListener('closeOrganizationModal', onCloseOrg as EventListener);
            window.removeEventListener('openOrganizationModal', onOpenOrg as EventListener);
        };
    }, []);

    // Share functionality
    const handleShare = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
        }
    };

    // Export to PDF functionality
    const handleExportPDF = async () => {
        setExportLoading(true);
        try {
            await exportDashboardToPDF({
                stats,
                projectTypes,
                organizationTypes,
                getFilterDescription
            });
        } catch {
            alert('Failed to generate PDF. Please try again or check console for details.');
        } finally {
            setExportLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">{labels.loading.message}</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !dashboardData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-2">{labels.error.message}</p>
                    <p className="text-slate-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    // Extract data for use in component
    const { stats, projectTypes, organizationsWithProjects, allOrganizations, donorCountries: availableDonorCountries, investmentTypes: availableInvestmentTypes } = dashboardData;

    // Ensure the organization type chart always shows all known types.
    // Get all types from the pre-generated organizations-with-types.json dictionary
    // and combine with any types inferred from the current organizations list.
    // Get all organization types from organizations-table.json and organizationsWithProjects
    const typesFromTable = Array.from(
        new Set(
            organizationsTable
                .map(rec => {
                    const orgType = rec.fields['Org Type'];
                    if (typeof orgType === 'string') {
                        return orgType.trim();
                    } else if (Array.isArray(orgType) && orgType.length > 0) {
                        // Handle array case - take first element if it's a string
                        return typeof orgType[0] === 'string' ? orgType[0].trim() : undefined;
                    }
                    return undefined;
                })
                .filter((v): v is string => typeof v === 'string' && v.length > 0)
        )
    );
    const inferredTypes = Array.from(new Set(organizationsWithProjects.map(org => org.type).filter(Boolean)));
    const allOrgTypes = Array.from(new Set([...typesFromTable, ...inferredTypes]));

    // Calculate organization types using both organizationsWithProjects and organizationsTable
    const organizationTypes: OrganizationTypeData[] = calculateOrganizationTypesFromOrganizationsWithProjects(
        organizationsWithProjects,
        allOrgTypes
    );

    // Convert data for ChartCard components (they expect 'value' instead of 'count')
    const organizationTypesChartData = organizationTypes.map(item => ({ name: item.name, value: item.count }));
    const projectTypesChartData = projectTypes.map(item => ({ name: item.name, value: item.count }));

    // Generate dynamic filter description for Organizations & Projects section
    const getFilterDescription = () => {
        const parts: string[] = [];
        const hasFilters = combinedDonors.length > 0 || investmentTypes.length > 0 || searchQuery;

        if (!hasFilters) {
            return labels.filterDescription.showingAll
                .replace('{projects}', stats.dataProjects.toString())
                .replace('{organizations}', stats.dataProviders.toString());
        }

        // Start with donor countries - list all selected donors with proper sentence punctuation
        if (combinedDonors.length > 0) {
            let donorString: string;
            if (combinedDonors.length === 1) {
                donorString = combinedDonors[0];
            } else if (combinedDonors.length === 2) {
                donorString = `${combinedDonors[0]} & ${combinedDonors[1]}`;
            } else {
                donorString = `${combinedDonors.slice(0, -1).join(', ')} & ${combinedDonors[combinedDonors.length - 1]}`;
            }

            parts.push(donorString);
            // Use singular/plural verb form: single donor -> 'funds' (from labels), multiple donors -> 'Fund' (capitalized per request)
            const verb = combinedDonors.length === 1 ? labels.filterDescription.funds : 'co-finance';
            parts.push(verb);
        } else {
            parts.push(labels.filterDescription.showing);
        }

        // Add project count
        const projectLabel = stats.dataProjects !== 1
            ? labels.filterDescription.projects
            : labels.filterDescription.project;
        parts.push(`${stats.dataProjects} ${projectLabel}`);

        // Add investment types with full display names (list all selected types)
        if (investmentTypes.length > 0) {
            parts.push(labels.filterDescription.in);
            // Map selected type keys to display names where possible
            const displayTypes = investmentTypes.map(type => {
                const typeKey = Object.keys(labels.investmentTypes).find(key =>
                    labels.investmentTypes[key as keyof typeof labels.investmentTypes].toLowerCase().includes(type.toLowerCase()) ||
                    type.toLowerCase().includes(key.toLowerCase())
                );
                return typeKey ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes] : type;
            });

            parts.push(displayTypes.join(', '));
        }

        // Add search query
        if (searchQuery) {
            parts.push(labels.filterDescription.relatingTo);
            parts.push(`"${searchQuery}"`);
        }

        return parts.join(' ');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header Section - Fixed */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[82rem] mx-auto px-8 py-4">
                    <div className="flex items-start justify-between mb-0">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                <span className="qanelas-subtitle">{labels.header.title}</span> <span className="font-roboto">{labels.header.subtitle}</span>
                            </h1>
                            <TooltipProvider>
                                <TooltipUI>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-help bg-slate-100 border-slate-200 text-slate-600"
                                        >
                                            <span className="text-xs font-semibold">
                                                {labels.header.betaBadge}
                                            </span>
                                            <Info className="w-3.5 h-3.5 ml-2 text-slate-400" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        align="center"
                                        className="max-w-105 p-3 bg-white text-slate-800 text-sm rounded-lg border border-slate-200"
                                        sideOffset={6}
                                        avoidCollisions={true}
                                        style={{ ...STYLES.chartTooltip }}
                                    >
                                        <p className="leading-relaxed">{labels.header.betaTooltip}</p>
                                    </TooltipContent>
                                </TooltipUI>
                            </TooltipProvider>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL)}
                                className="bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                                title="Give Feedback on Data Set"
                            >
                                <MessageCircle className="w-4 h-4 mr-2" />
                                {'Give Feedback'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportPDF}
                                disabled={exportLoading}
                                className="hidden bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                                title="Export current view as PDF"
                            >
                                <FileDown className="w-4 h-4 mr-2" />
                                {exportLoading ? 'Exporting...' : 'Export as One-Pager'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShare}
                                className={`bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] ${shareSuccess
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'hover:var(--brand-bg-light)'
                                    }`}
                                title="Copy link to clipboard"
                            >
                                <Share2 className="w-7 h-4 mr-2" />
                                {shareSuccess ? labels.header.shareButtonSuccess : labels.header.shareButton}
                            </Button>
                            {logoutButton}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Add top padding to account for fixed header */}
            <div className="max-w-[82rem] mx-auto px-8 py-6 pt-24">
                <div className="space-y-[var(--spacing-section)]">

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-section)]">
                        <StatCard
                            icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.donorCountries.title}
                            value={stats.donorCountries}
                            label={labels.stats.donorCountries.label}
                            colorScheme="amber"
                            tooltip={labels.stats.donorCountries.tooltip}
                        />
                        <StatCard
                            icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.dataProviders.title}
                            value={stats.dataProviders}
                            label={labels.stats.dataProviders.label}
                            colorScheme="amber"
                            tooltip={labels.stats.dataProviders.tooltip}
                        />
                        <StatCard
                            icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.dataProjects.title}
                            value={stats.dataProjects}
                            label={labels.stats.dataProjects.label}
                            colorScheme="amber"
                            tooltip={labels.stats.dataProjects.tooltip}
                        />

                    </div>

                    {/* Main Layout - Two Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-section)]">

                        {/* Left Column - Filters and Table */}
                        <div className="lg:col-span-2 space-y-[var(--spacing-section)]">
                            {/* Organizations Table Section */}
                            <div>
                                <Card className={STYLES.cardGlass}>
                                    <CardHeader className="pb-0 h-0">
                                        <CardTitle>
                                            <SectionHeader
                                                icon={
                                                    organizationsWithProjects && organizationsWithProjects.some(org => org.projects && org.projects.length > 0)
                                                        ? <FolderOpenDot className="text-slate-600" />
                                                        : <FolderDot className="text-slate-600" />
                                                }
                                                title={labels.sections.organizationsAndProjects}
                                            />
                                        </CardTitle>

                                    </CardHeader>

                                    {/* Filters */}
                                    <CardContent className="p-6 h-4">
                                        <div className="flex items-center gap-3">
                                            {/* Modern Search Bar */}
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <Input
                                                    id="search"
                                                    type="text"
                                                    placeholder={labels.filters.searchPlaceholder}
                                                    value={searchQuery}
                                                    onChange={(e) => onSearchChange(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onSearchSubmit();
                                                        }
                                                    }}
                                                    className="h-10 pl-10 pr-4 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
                                                />
                                            </div>

                                            {/* Donor Countries Multi-Select */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={`h-10 w-52 justify-between font-medium transition-all ${combinedDonors.length > 0
                                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                                            : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <Globe className="h-4 w-4 shrink-0" />
                                                            <span className="truncate">
                                                                {combinedDonors.length === 0
                                                                    ? labels.filters.donorPlaceholder
                                                                    : combinedDonors.length === 1
                                                                        ? combinedDonors[0]
                                                                        : `${combinedDonors.length} donors`
                                                                }
                                                            </span>
                                                        </div>
                                                        <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start"
                                                    side="bottom"
                                                    sideOffset={4}
                                                    className="w-52 max-h-[300px] overflow-y-auto bg-white border border-slate-200 shadow-lg"
                                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                                >
                                                    {combinedDonors.length > 0 && (
                                                        <>
                                                            <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                                                <Filter className="h-3 w-3" />
                                                                {combinedDonors.length} selected
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    {availableDonorCountries.map((donor) => (
                                                        <DropdownMenuCheckboxItem
                                                            key={donor}
                                                            checked={combinedDonors.includes(donor)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    // Add and deduplicate using a Set to guard against race or duplicate entries
                                                                    onDonorsChange(Array.from(new Set([...combinedDonors, donor])));
                                                                } else {
                                                                    onDonorsChange(combinedDonors.filter(d => d !== donor));
                                                                }
                                                            }}
                                                            onSelect={(e) => e.preventDefault()}
                                                            className="cursor-pointer"
                                                        >
                                                            {donor}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Investment Types Multi-Select */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className={`h-10 w-52 justify-between font-medium transition-all ${investmentTypes.length > 0
                                                            ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                                            : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <DatabaseBackup className="h-4 w-4 shrink-0" />
                                                            <span className="truncate">
                                                                {investmentTypes.length === 0
                                                                    ? labels.filters.typePlaceholder
                                                                    : investmentTypes.length === 1
                                                                        ? (() => {
                                                                            const type = investmentTypes[0];
                                                                            const typeKey = Object.keys(labels.investmentTypes).find(key =>
                                                                                labels.investmentTypes[key as keyof typeof labels.investmentTypes].toLowerCase().includes(type.toLowerCase()) ||
                                                                                type.toLowerCase().includes(key.toLowerCase())
                                                                            );
                                                                            return typeKey
                                                                                ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes]
                                                                                : type;
                                                                        })()
                                                                        : `${investmentTypes.length} types`
                                                                }
                                                            </span>
                                                        </div>
                                                        <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="start"
                                                    side="bottom"
                                                    sideOffset={4}
                                                    className="w-64 max-h-[300px] overflow-y-auto bg-white border border-slate-200 shadow-lg"
                                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                                >
                                                    {investmentTypes.length > 0 && (
                                                        <>
                                                            <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                                                <Filter className="h-3 w-3" />
                                                                {investmentTypes.length} selected
                                                            </DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    {availableInvestmentTypes.map((type) => {
                                                        // Find the label from labels.json
                                                        const typeKey = Object.keys(labels.investmentTypes).find(key =>
                                                            labels.investmentTypes[key as keyof typeof labels.investmentTypes].toLowerCase().includes(type.toLowerCase()) ||
                                                            type.toLowerCase().includes(key.toLowerCase())
                                                        );
                                                        const displayName = typeKey
                                                            ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes]
                                                            : type;

                                                        // Normalize comparison: check if any investmentType matches this type (case-insensitive)
                                                        const isChecked = investmentTypes.some(selected =>
                                                            selected.toLowerCase().trim() === type.toLowerCase().trim()
                                                        );

                                                        return (
                                                            <DropdownMenuCheckboxItem
                                                                key={type}
                                                                checked={isChecked}
                                                                onCheckedChange={(checked) => {
                                                                    if (checked) {
                                                                        // Add only if not already present (case-insensitive check)
                                                                        const alreadyExists = investmentTypes.some(t =>
                                                                            t.toLowerCase().trim() === type.toLowerCase().trim()
                                                                        );
                                                                        if (!alreadyExists) {
                                                                            onTypesChange([...investmentTypes, type]);
                                                                        }
                                                                    } else {
                                                                        // Remove all case-insensitive matches
                                                                        onTypesChange(investmentTypes.filter(t =>
                                                                            t.toLowerCase().trim() !== type.toLowerCase().trim()
                                                                        ));
                                                                    }
                                                                }}
                                                                onSelect={(e) => e.preventDefault()}
                                                                className="cursor-pointer"
                                                            >
                                                                {displayName}
                                                            </DropdownMenuCheckboxItem>
                                                        );
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Reset Filters Button */}
                                            <Button
                                                variant="outline"
                                                onClick={onResetFilters}
                                                disabled={!(combinedDonors.length > 0 || investmentTypes.length > 0 || searchQuery)}
                                                className={`h-10 px-4 font-medium transition-all ${combinedDonors.length > 0 || investmentTypes.length > 0 || searchQuery
                                                    ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300'
                                                    : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
                                                    }`}
                                                title="Reset all filters"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                    <p className="text-sm text-slate-600 mt-1 ml-7">
                                        {getFilterDescription()}
                                    </p>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {organizationsWithProjects.map((org) => {
                                                const isExpanded = expandedOrgs.has(org.id);

                                                return (
                                                    <Collapsible
                                                        key={org.id}
                                                        open={isExpanded}
                                                        onOpenChange={() => {
                                                            const newExpanded = new Set(expandedOrgs);
                                                            if (isExpanded) {
                                                                newExpanded.delete(org.id);
                                                            } else {
                                                                newExpanded.add(org.id);
                                                            }
                                                            setExpandedOrgs(newExpanded);
                                                        }}
                                                    >
                                                        <CollapsibleTrigger className="w-full">
                                                            <div className={STYLES.orgRow}>
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-4 h-4 flex-shrink-0"> {/* Fixed size container */}
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                                                        )}
                                                                    </div>
                                                                    <div className="text-left">
                                                                        <div className="flex items-center gap-2">
                                                                            <h3
                                                                                className="font-medium text-slate-900 cursor-pointer transition-colors hover:text-[var(--brand-primary)]"
                                                                                onClick={e => {
                                                                                    e.stopPropagation();
                                                                                    setSelectedOrganization(org);
                                                                                }}
                                                                            >
                                                                                {org.organizationName}
                                                                            </h3>
                                                                            {(() => {
                                                                                // Find matching record in organizations-table.json
                                                                                const orgTableMatch = organizationsTable.find(rec => {
                                                                                    const full = (rec.fields['Org Full Name'] as string) || '';
                                                                                    const short = (rec.fields['Org Short Name'] as string) || '';
                                                                                    const altFull = (rec.fields['Org Fullname'] as string) || '';
                                                                                    const normalized = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
                                                                                    const target = normalized(org.organizationName || org.id);
                                                                                    return [full, short, altFull].some(s => normalized(String(s || '')) === target);
                                                                                });
                                                                                const orgType = orgTableMatch?.fields['Org Type'] as string | undefined;
                                                                                return orgType ? (
                                                                                    <div className="inline-flex items-center px-1.5 py-px rounded text-[11px] font-medium text-slate-500 bg-transparent border border-slate-200">
                                                                                        {orgType}
                                                                                    </div>
                                                                                ) : null;
                                                                            })()}                                                                                                                            </div>
                                                                        <div className="flex flex-wrap gap-1 mt-2 max-w-[600px] mr-4">
                                                                            {(() => {
                                                                                const isCountriesExpanded = expandedCountries.has(org.id);

                                                                                // Deduplicate countries first
                                                                                const uniqueCountries = Array.from(new Set(org.donorCountries)) as string[];
                                                                                // Sort countries: selected donors first, then others alphabetically
                                                                                let sortedCountries = [...uniqueCountries];
                                                                                if (combinedDonors.length > 0) {
                                                                                    sortedCountries = [
                                                                                        ...uniqueCountries.filter((c: string) => combinedDonors.includes(c)),
                                                                                        ...uniqueCountries.filter((c: string) => !combinedDonors.includes(c)).sort()
                                                                                    ];
                                                                                }
                                                                                const countriesToShow = isCountriesExpanded
                                                                                    ? sortedCountries
                                                                                    : sortedCountries.slice(0, 5);

                                                                                return (
                                                                                    <>
                                                                                        {countriesToShow.map((country: string, idx: number) => (
                                                                                            <Badge
                                                                                                key={idx}
                                                                                                text={country}
                                                                                                variant={combinedDonors.includes(country) ? 'blue' : 'slate'}
                                                                                            />
                                                                                        ))}
                                                                                        {sortedCountries.length > 5 && !isCountriesExpanded && (
                                                                                            <div
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    const newExpanded = new Set(expandedCountries);
                                                                                                    newExpanded.add(org.id);
                                                                                                    setExpandedCountries(newExpanded);
                                                                                                }}
                                                                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                            >
                                                                                                +{sortedCountries.length - 5} more
                                                                                            </div>
                                                                                        )}
                                                                                        {isCountriesExpanded && sortedCountries.length > 5 && (
                                                                                            <div
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    const newExpanded = new Set(expandedCountries);
                                                                                                    newExpanded.delete(org.id);
                                                                                                    setExpandedCountries(newExpanded);
                                                                                                }}
                                                                                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                            >
                                                                                                Show less
                                                                                            </div>
                                                                                        )}
                                                                                    </>
                                                                                );
                                                                            })()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-sm text-slate-600">
                                                                    {org.projects.length} product{org.projects.length !== 1 ? 's' : ''}
                                                                </div>
                                                            </div>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <div className="mt-2 ml-7 space-y-2">
                                                                {org.projects.map((project: ProjectData) => (
                                                                    <div
                                                                        key={project.id}
                                                                        className={STYLES.projectItem}
                                                                        onClick={() => setSelectedProject({ project, organizationName: org.organizationName })}
                                                                    >
                                                                        <div className="mb-2">
                                                                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                                                                                <span className="font-medium text-slate-900 group-hover:text-[var(--brand-primary)] transition-colors">
                                                                                    {project.projectName}
                                                                                </span>
                                                                                {project.investmentTypes.length > 0 && (
                                                                                    <div className="flex flex-wrap gap-1 items-center">
                                                                                        {project.investmentTypes.map((type, idx) => (
                                                                                            <Badge key={idx} text={type} variant="indigo" />
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className={STYLES.sectionLabel}>{labels.projectDetails.donorCountries}</div>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {project.donorCountries.length > 0 ? (
                                                                                    project.donorCountries.map((country, idx) => (
                                                                                        <Badge key={idx} text={country} variant="emerald" />
                                                                                    ))
                                                                                ) : (
                                                                                    <span className="text-xs text-slate-500">{labels.projectDetails.notSpecified}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CollapsibleContent>
                                                    </Collapsible>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Right Column - Charts */}
                        <div className="space-y-[var(--spacing-section)]">

                            <ChartCard
                                title={labels.sections.organizationTypes}
                                icon={<Building2 className="text-slate-600" />}
                                data={organizationTypesChartData}
                                barColor="var(--brand-primary-lighter)"
                            />
                            <ChartCard
                                title={labels.sections.projectCategories}
                                icon={<Database className="text-slate-600" />}
                                data={projectTypesChartData}
                                barColor="var(--brand-primary-lighter)"
                                footnote="Note: A project can be assigned to multiple types."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Impressum Footer */}
            <footer className="bg-slate-100 border-t border-slate-200 mt-16">
                <div className="max-w-[82rem] mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">

                        <div className="text-center flex-1">
                            <p className="text-sm text-slate-600">
                                {labels.footer.dataGatheredBy}{' '}
                                <a
                                    href="https://crafd.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline"
                                    style={{ color: 'var(--brand-primary)' }}
                                >
                                    {labels.footer.organization}
                                </a>
                                {' '}

                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {labels.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                            </p>
                        </div>

                    </div>
                </div>
            </footer>

            {/* Project Modal */}
            {selectedProject && (
                <ProjectModal
                    project={selectedProject.project}
                    organizationName={selectedProject.organizationName}
                    allOrganizations={allOrganizations}
                    loading={projectModalLoading}
                />
            )}
            {/* Organization Modal */}
            {selectedOrganization && (
                (() => {
                    // Try to find a matching record in the organizations table using multiple possible fields
                    const match = organizationsTable.find(rec => {
                        const full = (rec.fields['Org Full Name'] as string) || '';
                        const short = (rec.fields['Org Short Name'] as string) || '';
                        const altFull = (rec.fields['Org Fullname'] as string) || '';
                        const normalized = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
                        const target = normalized(selectedOrganization.organizationName || selectedOrganization.id);
                        return [full, short, altFull].some(s => normalized(String(s || '')) === target);
                    });

                    // Build a fallback orgRecord and include resolved project names from organizationsWithProjects
                    const orgProjects = organizationsWithProjects.find(o => o.id === selectedOrganization.id);
                    const projectNames = orgProjects ? orgProjects.projects.map(p => p.projectName) : [];

                    const orgRecord = match || {
                        id: selectedOrganization.id,
                        fields: {
                            'Org Full Name': selectedOrganization.organizationName,
                            'Org Donor Countries (based on Agency)': selectedOrganization.donorCountries || [],
                            // Provide a friendly field containing project names so the modal can show names instead of IDs
                            'Provided Data Ecosystem Projects (Names)': projectNames
                        }
                    };

                    return (
                        <OrganizationModal
                            organization={orgRecord}
                            loading={false}
                        />
                    );
                })()
            )}
        </div>
    );
};

export default CrisisDataDashboard;