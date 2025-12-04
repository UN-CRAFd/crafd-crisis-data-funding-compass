'use client';

import { useState, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import labels from '@/config/labels.json';
import { 
    BookOpen, 
    Database, 
    CheckCircle2, 
    AlertTriangle,
    Layers,
    Users,
    FileText,
    Search,
    MessageCircle,
    TrendingUp,
    Shield,
    Server,
    BarChart3,
    Settings,
    Download,
    LucideIcon
} from 'lucide-react';

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/** Basic info card with title and description */
const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
);

/** Info card with icon in title */
const IconInfoCard = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) => (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
            {title}
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
);

/** Numbered step card */
const NumberedStep = ({ step, title, children }: { step: number; title: string; children: React.ReactNode }) => (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ backgroundColor: 'var(--brand-primary)' }}>
                {step}
            </div>
            <h4 className="font-semibold text-slate-800">{title}</h4>
        </div>
        <p className="text-sm text-slate-600 ml-11 leading-relaxed">{children}</p>
    </div>
);

/** Warning/limitation card with amber background */
const WarningCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
    </div>
);

/** Section header with icon */
const SectionTitle = ({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <Icon className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
        {children}
    </h3>
);

/** Screenshot display */
const Screenshot = ({ src, alt }: { src: string; alt: string }) => (
    <div className="bg-white rounded-lg p-8 border border-none flex items-center justify-center min-h-[400px]">
        <img src={src} alt={alt} className="max-w-full max-h-[520px] rounded-md object-contain" loading="lazy" />
    </div>
);

/** Interactive network image with color-based tooltips */
const InteractiveNetworkImage = () => {
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    const getColorLabel = (r: number, g: number, b: number): string => {
        // Slate colors (donors) - greyish
        if (r > 150 && r < 200 && g > 150 && g < 200 && b > 180 && b < 220) {
            return 'Donor Node';
        }
        // Brand primary light (organizations) - blue/orange-ish tones
        if (r > 200 && g > 150 && b < 100) {
            return 'Organization Node';
        }
        // Purple/other colors (projects) - purple tones
        if (r > 150 && b > 150 && g < 150) {
            return 'Asset/Project Node';
        }
        // Links or connections - darker colors
        if (r < 100 && g < 100 && b < 100) {
            return 'Connection Link';
        }
        // White/light background
        if (r > 240 && g > 240 && b > 240) {
            return 'Canvas Background';
        }
        return 'Network Element';
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!canvasRef.current || !imgRef.current || !imgRef.current.complete) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Create temporary canvas for pixel reading
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgRef.current.naturalWidth;
        tempCanvas.height = imgRef.current.naturalHeight;
        const ctx = tempCanvas.getContext('2d');
        
        if (!ctx) return;

        // Scale coordinates from canvas to image
        const scale = imgRef.current.naturalWidth / rect.width;
        const imgX = Math.floor(x * scale);
        const imgY = Math.floor(y * scale);

        // Draw image and get pixel data
        ctx.drawImage(imgRef.current, 0, 0);
        const imageData = ctx.getImageData(imgX, imgY, 1, 1);
        const [r, g, b] = imageData.data;

        setTooltip({
            text: getColorLabel(r, g, b),
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    return (
        <div 
            ref={canvasRef}
            className="relative bg-white rounded-lg p-8 border border-none flex items-center justify-center min-h-[400px] cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <img 
                ref={imgRef}
                src="/screenshots/network.png" 
                alt="Network Graph Visualization" 
                className="max-w-full max-h-[520px] rounded-md object-contain" 
                loading="lazy"
            />
            {tooltip && (
                <div 
                    className="fixed bg-slate-800 text-white text-xs rounded px-2 py-1 pointer-events-none whitespace-nowrap"
                    style={{
                        left: `${tooltip.x + 10}px`,
                        top: `${tooltip.y - 20}px`,
                        transform: 'translateX(0)'
                    }}
                >
                    {tooltip.text}
                </div>
            )}
        </div>
    );
};

/** Bullet list item */
const BulletItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
        <span><strong>{children}</strong></span>
    </li>
);

// ============================================================================
// DATA & CONFIG
// ============================================================================

interface MethodologyPageProps {
    logoutButton?: React.ReactNode;
}

const INVESTMENT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; step: string }> = {
    'Data Sets & Commons': { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', step: 'bg-blue-600' },
    'Infrastructure & Platforms': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900', step: 'bg-red-600' },
    'Crisis Analytics & Insights': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-900', step: 'bg-orange-400' },
    'Human Capital & Know-how': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-900', step: 'bg-green-600' },
    'Standards & Coordination': { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-900', step: 'bg-purple-600' },
    'Learning & Exchange': { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-900', step: 'bg-indigo-600' },
};

const INVESTMENT_TYPE_DATA: Record<string, { icon: LucideIcon; description: string; themes: string[] }> = {
    'Data Sets & Commons': {
        icon: Database,
        description: 'Open and shared data resources that provide foundational information for crisis response and humanitarian action.',
        themes: ['Humanitarian Access Data', 'Displacement & Migration Data', 'Baseline Population Data', 'Geospatial Data', 'Household Survey Data', 'Health Data', 'Food Security Data', 'Nutrition Data', 'Climate Data', 'Conflict & Violence Data', 'Gender Data', 'Education Data', 'WASH Data', 'Poverty Data', 'Environmental Data', '3W Data', 'Administrative Boundaries']
    },
    'Infrastructure & Platforms': {
        icon: Server,
        description: 'Technical systems and platforms that enable data collection, storage, processing, and distribution at scale.',
        themes: ['Geographic Information Systems (GIS)', 'Data Governance & Management', 'Data Collection', 'AI & ML Infrastructure', 'Data Processing & Transformation', 'Data Storage', 'Access & Sharing', 'Data Quality & Validation', 'Data Documentation & Metadata', 'Open Source LLMs']
    },
    'Crisis Analytics & Insights': {
        icon: BarChart3,
        description: 'Analytical products, models, and visualizations that transform raw data into actionable intelligence.',
        themes: ['Needs Assessment Analytics', 'Climate Analytics', 'Health Analytics', 'Monitoring & Alerts', 'Disaster Hazard & Risk Modelling', 'Food Security Analytics', 'Displacement Analytics', 'Conflict Analytics', 'Population Analytics', 'Geospatial Analytics', 'AI Models', 'Anticipatory & Early Action Forecasts', 'Gender Analytics', 'Poverty Analytics', 'Damage Assessments']
    },
    'Human Capital & Know-how': {
        icon: Users,
        description: 'Investments in people, skills, and organizational capacity to effectively use and produce crisis data.',
        themes: ['Capacity Building', 'Upskilling & Training', 'Data Analytics', 'Information Management', 'Surge Capacity', 'Regional Hubs', 'Data Collection & Generation', 'Data Management & Visualization', 'Applied Data Analytics & Insights Generation', 'Digital Product & Tool Development']
    },
    'Standards & Coordination': {
        icon: Settings,
        description: 'Frameworks, protocols, and coordination mechanisms that enable interoperability and collective action.',
        themes: ['Common Indicators', 'Methodological Standards', 'Metadata', 'Open Access', 'Ethics', 'Interoperable Formats', 'Data Documentation', 'APIs Standard', 'Open Source', 'Data Protection & Privacy Frameworks', 'Standard Geocodes', 'Peer Review']
    },
    'Learning & Exchange': {
        icon: BookOpen,
        description: 'Knowledge sharing, documentation, and community building that advances the field of crisis data.',
        themes: ['Workshops', 'Webinars', 'Best Practices', 'Conferences', 'Guides', 'Case Studies', 'Communities of Practice', 'Forums', 'Peer Learning', 'Talk Series']
    },
};

const INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_DATA);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MethodologyPage({ logoutButton }: MethodologyPageProps) {
    const [shareSuccess, setShareSuccess] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>('Data Sets & Commons');

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShareSuccess(true);
            setTimeout(() => {
                setShareSuccess(false);
            }, 2000);
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                logoutButton={logoutButton}
                onShare={handleShare}
                shareSuccess={shareSuccess}
            />
            
            {/* Main Content */}
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-4 pt-20 sm:pt-24">
                <div className="space-y-4 sm:space-y-4">

                    {/* Hero Section */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] p-6 sm:p-8 border-none">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <BookOpen className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
                                <h1 className="text-3xl sm:text-4xl font-bold font-qanelas-subtitle" style={{ color: 'black' }}>
                                    Methodology
                                </h1>
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 max-w-3xl leading-relaxed">
                                Understand how data was collected and how to use it best for your research
                            </p>
                        </div>
                    </div>

                    {/* Overview Cards */}
               
                    {/* Main Methodology Content */}
                    <Card className="!border-0 bg-white">
                        <CardContent className="p-4 sm:p-6">
                            <Tabs defaultValue="collection" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2 bg-slate-50 p-2">
                                    {[
                                        { value: 'collection', icon: Search, label: 'Collection' },
                                        { value: 'classification', icon: FileText, label: 'Classification' },
                                        { value: 'validation', icon: CheckCircle2, label: 'Validation' },
                                        { value: 'filtering', icon: Layers, label: 'Filtering' },
                                        { value: 'network', icon: TrendingUp, label: 'Network' },
                                        { value: 'export', icon: Download, label: 'Export' },
                                    ].map(({ value, icon: Icon, label }) => (
                                        <TabsTrigger key={value} value={value} className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            <Icon className="w-4 h-4 mr-2" />{label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>

                                {/* Data Collection Tab */}
                                <TabsContent value="collection" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={Search}>Data Collection</SectionTitle>
                                            <div className="space-y-4">
                                                <NumberedStep step={1} title="Source Identification">
                                                    We aggregate data from a curated set of public and partner sources, including international organizations, government portals, and open data repositories relevant to crisis funding and humanitarian response.
                                                </NumberedStep>
                                                <NumberedStep step={2} title="Automated & Manual Gathering">
                                                    Data is collected through a combination of automated pipelines (APIs, web scraping) and manual curation to ensure completeness and accuracy.
                                                </NumberedStep>
                                                <NumberedStep step={3} title="Regular Updates">
                                                    The dataset is refreshed periodically to capture new funding flows, projects, and organizational changes.
                                                </NumberedStep>
                                            </div>
                                        </div>
                                        <Screenshot src="/screenshots/collection.png" alt="Data Collection Process" />
                                    </div>
                                </TabsContent>

                                {/* Classification Tab */}
                                <TabsContent value="classification" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={FileText}>Data Classification</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="Entity Mapping">
                                                    Organizations, donors, and projects are mapped to unique identifiers to avoid duplication and enable cross-referencing.
                                                </InfoCard>
                                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                    <h4 className="font-semibold text-slate-800 mb-2">Investment Typing</h4>
                                                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                                        Each project is classified into one or more investment types based on project descriptions and metadata:
                                                    </p>
                                                    <ul className="space-y-2 text-sm text-slate-600">
                                                        {INVESTMENT_TYPES.map(type => <BulletItem key={type}>{type}</BulletItem>)}
                                                    </ul>
                                                </div>
                                                <InfoCard title="Theme Tagging">
                                                    Projects are tagged with thematic areas (e.g., health, displacement, food security) using keyword analysis and expert review.
                                                </InfoCard>
                                            </div>
                                        </div>
                                        
                                        {/* Interactive Classification Explorer */}
                                        <div className="bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden">
                                            <div className="p-4 border-b border-slate-200 bg-slate-50">
                                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                    <Layers className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                                                    Asset Type Explorer
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1">Click on an investment type to explore</p>
                                            </div>
                                            
                                            {/* Type Selector Buttons */}
                                            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {INVESTMENT_TYPES.map(type => {
                                                        const TypeIcon = INVESTMENT_TYPE_DATA[type].icon;
                                                        const isSelected = selectedType === type;
                                                        return (
                                                            <button
                                                                key={type}
                                                                onClick={() => setSelectedType(type)}
                                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                                                    isSelected ? 'border-2 shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                                }`}
                                                                style={isSelected ? { backgroundColor: 'var(--badge-other-bg)', color: 'var(--badge-other-text)', borderColor: 'var(--badge-other-border)' } : {}}
                                                            >
                                                                <TypeIcon className={`w-4 h-4 shrink-0 ${isSelected ? '' : 'text-slate-400'}`} />
                                                                <span className="truncate">{type}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {/* Selected Type Details */}
                                            {selectedType && INVESTMENT_TYPE_DATA[selectedType] && (() => {
                                                const { icon: TypeIcon, description, themes } = INVESTMENT_TYPE_DATA[selectedType];
                                                return (
                                                    <div className="p-4 space-y-4">
                                                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--badge-other-bg)', border: '1px solid var(--badge-other-border)' }}>
                                                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--badge-other-text)' }}>
                                                                <TypeIcon className="w-5 h-5 text-white" />
                                                            </div>
                                                            <h5 className="font-bold" style={{ color: 'var(--badge-other-text)' }}>{selectedType}</h5>
                                                        </div>
                                                        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
                                                        <div>
                                                            <h6 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Related Themes</h6>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {themes.map((theme, idx) => (
                                                                    <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--badge-other-bg)', color: 'var(--badge-other-text)', border: '1px solid var(--badge-other-border)' }}>
                                                                        {theme}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Validation Tab */}
                                <TabsContent value="validation" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={CheckCircle2}>Data Validation</SectionTitle>
                                            <div className="space-y-4">
                                                <IconInfoCard icon={Shield} title="Quality Assurance">
                                                    Automated checks flag inconsistencies, missing fields, and outliers. Manual review is conducted for high-impact records and edge cases.
                                                </IconInfoCard>
                                                <IconInfoCard icon={CheckCircle2} title="Source Verification">
                                                    Where possible, funding flows and project details are cross-checked against original sources or official reports.
                                                </IconInfoCard>
                                                <IconInfoCard icon={Users} title="Community Feedback">
                                                    Users can suggest corrections, suggest new entries or flag issues, which are reviewed by the data team.
                                                </IconInfoCard>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionTitle icon={AlertTriangle}>Limitations</SectionTitle>
                                            <div className="space-y-4">
                                                <WarningCard title="Data Gaps">
                                                    Not all funding flows or projects are publicly reported; some data may be incomplete or delayed.
                                                </WarningCard>
                                                <WarningCard title="Classification Subjectivity">
                                                    Investment type and theme assignments may involve interpretation, especially for multi-sector projects.
                                                </WarningCard>
                                                <WarningCard title="Simplification">
                                                    For clarity, some visualizations (e.g., UN donor lists) are simplified and do not reflect the full complexity of funding relationships.
                                                </WarningCard>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Filtering & Query Tab */}
                                <TabsContent value="filtering" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={Layers}>Filtering & Query</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="Search Logic">Search operates on project titles and organization names.</InfoCard>
                                                <InfoCard title="Donor Filter">Multiple donors trigger a conjunction. Returned projects must be co-financed by every selected donor.</InfoCard>
                                                <InfoCard title="Type Filter">
                                                    Multiple types trigger a disjunction. Organizations appear if any of their projects match at least one selected type.
                                                </InfoCard>
                                                <InfoCard title="Theme Filter">
                                                    Multiple themes trigger a disjunction. Projects appear if they match at least one of the selected themes.
                                                </InfoCard>
                                                <InfoCard title="Type–Theme Relationship">
                                                    Themes are nested under types. Selecting a type restricts theme options to those linked to that type. Themes from other types can still surface when projects span multiple types and carry overlapping themes.
                                                </InfoCard>
                                            </div>
                                        </div>
                                        
                                        {/* Interactive Filter Logic Flow */}
                                        <div className="bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm max-h-[668px] overflow-y-auto">
                                            
                                            {/* Flow Diagram */}
                                            <div className="space-y-3 text-xs">
                                                {/* Step 1: Donor Check */}
                                                <div className={`${INVESTMENT_TYPE_COLORS['Data Sets & Commons'].bg} border-2 ${INVESTMENT_TYPE_COLORS['Data Sets & Commons'].border} rounded-lg p-3`}>
                                                    <div className={`font-bold ${INVESTMENT_TYPE_COLORS['Data Sets & Commons'].text} mb-2 flex items-center gap-2`}>
                                                        <span className={`${INVESTMENT_TYPE_COLORS['Data Sets & Commons'].step} text-white rounded-full w-5 h-5 flex items-center justify-center text-xs`}>1</span>
                                                        Donor Filter (Gatekeeper)
                                                    </div>
                                                    <div className={`pl-7 space-y-1 ${INVESTMENT_TYPE_COLORS['Data Sets & Commons'].text}`}>
                                                        <div>🔍 Check: Does org have <strong>ALL</strong> selected donors?</div>
                                                        <div className="bg-white rounded px-2 py-1 border-2 border-blue-200 font-mono text-[10px]">
                                                            donors.every(d → org.donors.includes(d))
                                                        </div>
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="flex-1 bg-green-100 border-2 border-green-300 rounded px-2 py-1 text-green-800">
                                                                ✓ YES → Continue to Step 2
                                                            </div>
                                                            <div className="flex-1 bg-red-100 border-2 border-red-300 rounded px-2 py-1 text-red-800">
                                                                ✗ NO → Hide org entirely
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center">
                                                    <div className="w-0.5 h-4 bg-slate-300"></div>
                                                </div>

                                                {/* Step 2: Search Check */}
                                                <div className={`${INVESTMENT_TYPE_COLORS['Infrastructure & Platforms'].bg} border-2 ${INVESTMENT_TYPE_COLORS['Infrastructure & Platforms'].border} rounded-lg p-3`}>
                                                    <div className={`font-bold ${INVESTMENT_TYPE_COLORS['Infrastructure & Platforms'].text} mb-2 flex items-center gap-2`}>
                                                        <span className={`${INVESTMENT_TYPE_COLORS['Infrastructure & Platforms'].step} text-white rounded-full w-5 h-5 flex items-center justify-center text-xs`}>2</span>
                                                        Search Filter Check
                                                    </div>
                                                    <div className={`pl-7 space-y-1 ${INVESTMENT_TYPE_COLORS['Infrastructure & Platforms'].text}`}>
                                                        <div>🔍 Check: Does org name match search?</div>
                                                        <div className="bg-white rounded px-2 py-1 border-2 border-red-200 font-mono text-[10px]">
                                                            org.name.includes(searchQuery)
                                                        </div>
                                                        <div className="mt-2 space-y-2">
                                                            <div className="bg-green-100 border-2 border-green-300 rounded px-2 py-1.5 text-green-800">
                                                                <div className="font-semibold mb-1">✓ YES → Show ALL org projects</div>
                                                                <div className="text-[10px] pl-4">Then filter by Type/Theme if selected</div>
                                                            </div>
                                                            <div className="bg-orange-100 border-2 border-orange-300 rounded px-2 py-1.5 text-orange-800">
                                                                <div className="font-semibold mb-1">✗ NO → Check each project</div>
                                                                <div className="text-[10px] pl-4">Go to Step 3 for project-level filtering</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center">
                                                    <div className="w-0.5 h-4 bg-slate-300"></div>
                                                </div>

                                                {/* Step 3: Project-Level Filters */}
                                                <div className={`${INVESTMENT_TYPE_COLORS['Crisis Analytics & Insights'].bg} border-2 ${INVESTMENT_TYPE_COLORS['Crisis Analytics & Insights'].border} rounded-lg p-3`}>
                                                    <div className={`font-bold ${INVESTMENT_TYPE_COLORS['Crisis Analytics & Insights'].text} mb-2 flex items-center gap-2`}>
                                                        <span className={`${INVESTMENT_TYPE_COLORS['Crisis Analytics & Insights'].step} text-white rounded-full w-5 h-5 flex items-center justify-center text-xs`}>3</span>
                                                        Project-Level Filters
                                                    </div>
                                                    <div className={`pl-7 space-y-2 ${INVESTMENT_TYPE_COLORS['Crisis Analytics & Insights'].text}`}>
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-orange-200">
                                                            <div className="font-semibold mb-1">A. Search (if org didn't match)</div>
                                                            <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded">
                                                                project.name.includes(searchQuery)
                                                            </div>
                                                            <div className="mt-1 text-[10px]">Must match for project to be visible</div>
                                                        </div>
                                                        
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-orange-200">
                                                            <div className="font-semibold mb-1 flex items-center gap-1">
                                                                B. Type Filter <span className="text-green-600 font-bold">(OR logic)</span>
                                                            </div>
                                                            <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded">
                                                                project.types.some(t → selectedTypes.includes(t))
                                                            </div>
                                                            <div className="mt-1 text-[10px]">Project needs ≥1 matching type</div>
                                                        </div>
                                                        
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-orange-200">
                                                            <div className="font-semibold mb-1 flex items-center gap-1">
                                                                C. Theme Filter <span className="text-green-600 font-bold">(OR logic)</span>
                                                            </div>
                                                            <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded">
                                                                project.themes.some(th → selectedThemes.includes(th))
                                                            </div>
                                                            <div className="mt-1 text-[10px]">Project needs ≥1 matching theme</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center">
                                                    <div className="w-0.5 h-4 bg-slate-300"></div>
                                                </div>

                                                {/* Step 4: Final Decision */}
                                                <div className={`${INVESTMENT_TYPE_COLORS['Human Capital & Know-how'].bg} border-2 ${INVESTMENT_TYPE_COLORS['Human Capital & Know-how'].border} rounded-lg p-3`}>
                                                    <div className={`font-bold ${INVESTMENT_TYPE_COLORS['Human Capital & Know-how'].text} mb-2 flex items-center gap-2`}>
                                                        <span className={`${INVESTMENT_TYPE_COLORS['Human Capital & Know-how'].step} text-white rounded-full w-5 h-5 flex items-center justify-center text-xs`}>4</span>
                                                        Final Decision
                                                    </div>
                                                    <div className={`pl-7 space-y-2 ${INVESTMENT_TYPE_COLORS['Human Capital & Know-how'].text}`}>
                                                        <div className="bg-green-50 border-2 border-green-300 rounded px-2 py-1.5">
                                                            <div className="font-semibold text-green-800">Show Organization IF:</div>
                                                            <ul className="text-[10px] mt-1 space-y-0.5 text-green-700">
                                                                <li>• Passes donor check (Step 1)</li>
                                                                <li>• AND has ≥1 visible project after filtering</li>
                                                                <li>• OR org name matches search (shows all projects)</li>
                                                            </ul>
                                                        </div>
                                                        <div className="bg-red-50 border-2 border-red-300 rounded px-2 py-1.5">
                                                            <div className="font-semibold text-red-800">Hide Organization IF:</div>
                                                            <ul className="text-[10px] mt-1 space-y-0.5 text-red-700">
                                                                <li>• Fails donor check</li>
                                                                <li>• OR has 0 visible projects after filtering</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Key Insights */}
                                                <div className={`${INVESTMENT_TYPE_COLORS['Standards & Coordination'].bg} border-2 ${INVESTMENT_TYPE_COLORS['Standards & Coordination'].border} rounded-lg p-3 mt-4`}>
                                                    <div className={`font-bold ${INVESTMENT_TYPE_COLORS['Standards & Coordination'].text} mb-2 text-xs`}>🔑 Key Insights:</div>
                                                    <ul className={`space-y-1 text-[10px] ${INVESTMENT_TYPE_COLORS['Standards & Coordination'].text}`}>
                                                        <li className="flex gap-2">
                                                            <span className="font-bold">1.</span>
                                                            <span><strong>Donor filter</strong> is a gatekeeper — fails = entire org hidden</span>
                                                        </li>
                                                        <li className="flex gap-2">
                                                            <span className="font-bold">2.</span>
                                                            <span><strong>Search on org name</strong> shows ALL org projects (bypasses project search)</span>
                                                        </li>
                                                        <li className="flex gap-2">
                                                            <span className="font-bold">3.</span>
                                                            <span><strong>Type uses OR</strong> (any match) → <strong>Theme uses OR</strong> (any match)</span>
                                                        </li>
                                                        <li className="flex gap-2">
                                                            <span className="font-bold">4.</span>
                                                            <span>Filters cascade: Donor → Search → Type → Theme</span>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Network Analysis Tab */}
                                <TabsContent value="network" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={TrendingUp}>Network Analysis</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="Graph Structure">
                                                    The network view displays the filtered dataset as an undirected graph, showing relationships between donors, organizations, and projects.
                                                </InfoCard>
                                                <InfoCard title="Clustering Options">
                                                    Clustering options aggregate projects and organizations by type, making it easier to identify patterns and connections within specific investment categories.
                                                </InfoCard>
                                                <InfoCard title="Interactive Nodes">
                                                    Project and organization nodes are interactive and open a detail modal when clicked, providing in-depth information about entities and their relationships.
                                                </InfoCard>
                                                <InfoCard title="Spatial Interpretation">
                                                    Spatial proximity in the graph has no geographic or ideological meaning. Node positions are determined by the force-directed layout algorithm to optimize visualization clarity.
                                                </InfoCard>
                                            </div>
                                        </div>
                                        <InteractiveNetworkImage />
                                    </div>
                                </TabsContent>

                                {/* Export Tab */}
                                <TabsContent value="export" className="mt-6 animate-tab-enter">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={Download}>Export Functionality</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="CSV Export">
                                                    Exports two CSV files (organization table and asset table) in a ZIP archive. Organizations CSV includes names, types, descriptions, and funding sources. Assets CSV includes names, associated organizations, types, themes, donors, descriptions, and website.
                                                </InfoCard>
                                                <InfoCard title="Excel Export">
                                                    Export the same data as a professionally formatted Excel workbook. Includes organizations and assets sheets with styling and optimized column widths. Includes a README file with export metadata and current filter details.
                                                </InfoCard>
                                                <InfoCard title="Filtered Exports">
                                                    All exports respect your current filters (donors, investment types, themes, search query). The metadata and README file includes information about which filters were applied.
                                                </InfoCard>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionTitle icon={FileText}>How to Use & Share</SectionTitle>
                                            <div className="space-y-4">
                                                <NumberedStep step={1} title="Apply Filters">
                                                    Use the filter panel to narrow down the data to what you need (donor countries, investment types, themes, or search query).
                                                </NumberedStep>
                                                <NumberedStep step={2} title="Export or Share">
                                                    Click the export button to download your data as CSV, Excel, or PDF. Or use the share button to copy a link that preserves all your current filters for easy collaboration.
                                                </NumberedStep>
                                                <NumberedStep step={3} title="Share Filtered Views">
                                                    Click the share button to copy a link that includes all your current filters. Anyone who opens the link will see the exact same filtered view you're looking at.
                                                </NumberedStep>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Contact Section */}
                    <Card className="!border-0 bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]">
                        <CardContent className="p-6 sm:p-8">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <MessageCircle className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                                    <div>
                                        <h3 className="font-semibold text-slate-800 text-lg">Questions or Feedback?</h3>
                                        <p className="text-sm text-slate-600">We welcome your input to improve our methodology and data quality.</p>
                                    </div>
                                </div>
                                <a
                                    href="https://forms.gle/GEbp7ccRZm1XQLX18"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-lg whitespace-nowrap"
                                    style={{ backgroundColor: 'var(--brand-primary)' }}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Provide Feedback
                                </a>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-8 sm:mt-16">
                <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-0">
                        <div className="text-center flex-1">
                            <p className="text-xs sm:text-sm text-slate-600">
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
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {labels.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}