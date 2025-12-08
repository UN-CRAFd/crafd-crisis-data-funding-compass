'use client';

import { useState } from 'react';
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
    Copy,
    Check,
    LucideIcon,
    CalendarSync,
    Workflow,
    BookCheck
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

/** Bullet list item */
const BulletItem = ({ children }: { children: React.ReactNode }) => (
    <li className="flex items-start gap-2">
        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
        <span><strong>{children}</strong></span>
    </li>
);

/** Code block with copy button and syntax highlighting */
const CodeBlock = ({ code }: { code: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Simple Python syntax highlighting
    const highlightCode = (text: string) => {
        // Keywords
        const keywords = ['import', 'from', 'as', 'def', 'class', 'if', 'else', 'for', 'while', 'return', 'with', 'open', 'print'];
        const builtins = ['pd', 'zip_ref', 'zipfile', 'Path', 'len', 'read_csv', 'extractall', 'ZipFile', 'contains', 'groupby', 'size', 'str'];
        
        let html = text
            // Escape HTML first
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Process line by line to handle comments properly
        html = html.split('\n').map(line => {
            // Find comment position
            const commentIndex = line.indexOf('#');
            let beforeComment = line;
            let comment = '';
            
            if (commentIndex !== -1) {
                // Check if # is inside a string
                const singleQuotePos = line.lastIndexOf("'", commentIndex);
                const doubleQuotePos = line.lastIndexOf('"', commentIndex);
                const singleQuoteEnd = line.indexOf("'", singleQuotePos + 1);
                const doubleQuoteEnd = line.indexOf('"', doubleQuotePos + 1);
                
                const inSingleQuote = singleQuotePos !== -1 && (singleQuoteEnd === -1 || singleQuoteEnd > commentIndex);
                const inDoubleQuote = doubleQuotePos !== -1 && (doubleQuoteEnd === -1 || doubleQuoteEnd > commentIndex);
                
                if (!inSingleQuote && !inDoubleQuote) {
                    beforeComment = line.substring(0, commentIndex);
                    comment = line.substring(commentIndex);
                }
            }
            
            // Highlight strings (amber) in the non-comment part
            beforeComment = beforeComment.replace(/(['"])(?:(?=(\\?))\2.)*?\1/g, '<span style="color: #dab776;">$&</span>');
            
            // Highlight numbers (cyan) in the non-comment part
            beforeComment = beforeComment.replace(/\b\d+\b/g, '<span style="color: #7dd3fc;">$&</span>');
            
            // Highlight keywords (purple) in the non-comment part
            beforeComment = beforeComment.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span style="color: #c084fc;">$1</span>');
            
            // Highlight builtins (blue) in the non-comment part
            beforeComment = beforeComment.replace(new RegExp(`\\b(${builtins.join('|')})\\b`, 'g'), '<span style="color: #60a5fa;">$1</span>');
            
            // Highlight comment (green) - only if there is one
            if (comment) {
                comment = `<span style="color: #10b981;">${comment}</span>`;
            }
            
            return beforeComment + comment;
        }).join('\n');
        
        return html;
    };

    return (
        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Python</span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    title="Copy to clipboard"
                >
                    {copied ? (
                        <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-emerald-400 font-medium">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-400">Copy</span>
                        </>
                    )}
                </button>
            </div>
            <pre className="text-xs text-slate-100 overflow-x-auto p-4 font-mono leading-relaxed" style={{ fontFamily: "'Courier New', monospace" }}>
                <code 
                    className="whitespace-pre"
                    dangerouslySetInnerHTML={{ __html: highlightCode(code) }}
                />
            </pre>
        </div>
    );
};

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
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-0 pt-20 sm:pt-24">
                <Tabs defaultValue="collection" className="w-full">
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
                                <p className="text-base sm:text-lg text-slate-700 max-w-3xl leading-relaxed mb-6">
                                    Understand how our data was collected and how to use it best for your research
                                </p>
                                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2 bg-white/60 p-2">
                                    {[
                                        { value: 'collection', icon: Search, label: 'Collection' },
                                        { value: 'classification', icon: FileText, label: 'Classification' },
                                        { value: 'limitations', icon: AlertTriangle, label: 'Limitations' },
                                        { value: 'filtering', icon: Layers, label: 'Filtering' },
                                        { value: 'network', icon: TrendingUp, label: 'Network' },
                                        { value: 'export', icon: Download, label: 'Export' },
                                    ].map(({ value, icon: Icon, label }) => (
                                        <TabsTrigger key={value} value={value} className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                            <Icon className="w-4 h-4 mr-2" />{label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>
                        </div>

                        {/* Overview Cards */}
                   
                        {/* Main Methodology Content */}
                        <Card className="!border-0 bg-white">
                            <CardContent className="px-4 sm:px-6 pt-0 pb-0 sm:pb-0">

                                {/* Data Collection Tab */}
                                <TabsContent value="collection" className="mt-0 animate-tab-enter mb-0">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <SectionTitle icon={Search}>Data Collection</SectionTitle>
                                            <div className="space-y-4">
                                                <IconInfoCard icon={BookCheck}title="Source Identification">
                                                    We aggregate data from a curated set of public and partner sources, including international organizations, government portals, and open data repositories relevant to crisis funding and humanitarian response.
                                                </IconInfoCard>
                                                <IconInfoCard icon={Workflow} title="Automated & Manual Gathering">
                                                    Data is collected through a combination of automated pipelines (APIs, web scraping) and manual curation to ensure completeness and accuracy.
                                                </IconInfoCard>
                                                <IconInfoCard icon={CalendarSync} title="Regular Updates">
                                                    The dataset is refreshed periodically to capture new funding flows, projects, and organizational changes.
                                                </IconInfoCard>
                                            </div>
                                        </div>
                                        <Screenshot src="/screenshots/collection.png" alt="Data Collection Process" />
                                    </div>
                                </TabsContent>

                                {/* Classification Tab */}
                                <TabsContent value="classification" className="mt-0 animate-tab-enter">
                                    <div className="space-y-6">
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

                                {/* Limitations Tab */}
                                <TabsContent value="limitations" className="mt-0 animate-tab-enter">
                                    <div className="space-y-6">
                                        
                                        <div>
                                            <SectionTitle icon={AlertTriangle}>Limitations</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="Data Gaps">
                                                    Not all funding flows or projects are publicly reported; some data may be incomplete or delayed.
                                                </InfoCard>
                                                <InfoCard title="Classification Subjectivity">
                                                    Investment type and theme assignments may involve interpretation, especially for multi-sector projects.
                                                </InfoCard>
                                                <InfoCard title="Simplification">
                                                    For clarity, some visualizations (e.g., UN donor lists) are simplified and do not reflect the full complexity of funding relationships.
                                                </InfoCard>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Filtering & Query Tab */}
                                <TabsContent value="filtering" className="mt-0 animate-tab-enter">
                                    <div className="space-y-6">
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
                                        <SectionTitle icon={Search}>Filtering Process</SectionTitle>

                                        <div className="bg-white rounded-lg p-6 border-2 border-none shadow-sm">
                                            
                                            {/* Flow Diagram */}
                                            <div className="space-y-3 text-xs">
                                                
                                                {/* Step 1: Donor Check */}
                                                <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3">
                                                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                        <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                                                        Donor Filter (Gatekeeper)
                                                    </div>
                                                    <div className="pl-7 space-y-1 text-slate-700">
                                                        <div>🔍 Check: Does org have <strong>ALL</strong> selected donors?</div>
                                                        <div className="bg-white rounded px-2 py-1 border-2 border-slate-200 font-mono text-[10px]">
                                                            donors.every(d → org.donors.includes(d))
                                                        </div>
                                                        <div className="flex gap-2 mt-2">
                                                            <div className="flex-1 bg-slate-50 border-2 border-slate-300 rounded px-2 py-1 text-slate-700">
                                                                ✓ YES → Continue to Step 2
                                                            </div>
                                                            <div className="flex-1 bg-slate-200 border-2 border-slate-400 rounded px-2 py-1 text-slate-800">
                                                                ✗ NO → Hide org entirely
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-center">
                                                    <div className="w-0.5 h-4 bg-slate-300"></div>
                                                </div>

                                                {/* Step 2: Search Check */}
                                                <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3">
                                                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                        <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                                                        Search Filter Check
                                                    </div>
                                                    <div className="pl-7 space-y-1 text-slate-700">
                                                        <div>🔍 Check: Does org name match search?</div>
                                                        <div className="bg-white rounded px-2 py-1 border-2 border-slate-200 font-mono text-[10px]">
                                                            org.name.includes(searchQuery)
                                                        </div>
                                                        <div className="mt-2 space-y-2">
                                                            <div className="bg-slate-50 border-2 border-slate-300 rounded px-2 py-1.5 text-slate-700">
                                                                <div className="font-semibold mb-1">✓ YES → Show ALL org projects</div>
                                                                <div className="text-[10px] pl-4">Then filter by Type/Theme if selected</div>
                                                            </div>
                                                            <div className="bg-slate-200 border-2 border-slate-400 rounded px-2 py-1.5 text-slate-800">
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
                                                <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3">
                                                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                        <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                                                        Project-Level Filters
                                                    </div>
                                                    <div className="pl-7 space-y-2 text-slate-700">
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-slate-200">
                                                            <div className="font-semibold mb-1">A. Search (if org didn't match)</div>
                                                            <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded">
                                                                project.name.includes(searchQuery)
                                                            </div>
                                                            <div className="mt-1 text-[10px]">Must match for project to be visible</div>
                                                        </div>
                                                        
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-slate-200">
                                                            <div className="font-semibold mb-1 flex items-center gap-1">
                                                                B. Type Filter <span style={{ color: 'var(--brand-primary-dark)' }} className="font-bold">(OR logic)</span>
                                                            </div>
                                                            <div className="text-[10px] font-mono bg-slate-50 px-2 py-1 rounded">
                                                                project.types.some(t → selectedTypes.includes(t))
                                                            </div>
                                                            <div className="mt-1 text-[10px]">Project needs ≥1 matching type</div>
                                                        </div>
                                                        
                                                        <div className="bg-white rounded px-3 py-2 border-2 border-slate-200">
                                                            <div className="font-semibold mb-1 flex items-center gap-1">
                                                                C. Theme Filter <span style={{ color: 'var(--brand-primary-dark)' }} className="font-bold">(OR logic)</span>
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
                                                <div className="bg-slate-100 border-2 border-slate-300 rounded-lg p-3">
                                                    <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                        <span className="bg-slate-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                                                        Final Decision
                                                    </div>
                                                    <div className="pl-7 space-y-2 text-slate-700">
                                                        <div className="bg-slate-50 border-2 border-slate-300 rounded px-2 py-1.5">
                                                            <div className="font-semibold text-slate-800">Show Organization IF:</div>
                                                            <ul className="text-[10px] mt-1 space-y-0.5 text-slate-700">
                                                                <li>• Passes donor check (Step 1)</li>
                                                                <li>• AND has ≥1 visible project after filtering</li>
                                                                <li>• OR org name matches search (shows all projects)</li>
                                                            </ul>
                                                        </div>
                                                        <div className="bg-slate-200 border-2 border-slate-400 rounded px-2 py-1.5">
                                                            <div className="font-semibold text-slate-800">Hide Organization IF:</div>
                                                            <ul className="text-[10px] mt-1 space-y-0.5 text-slate-700">
                                                                <li>• Fails donor check</li>
                                                                <li>• OR has 0 visible projects after filtering</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Key Insights */}
                                                <div className="border-2 rounded-lg p-3 mt-4" style={{ backgroundColor: 'var(--brand-bg-light)', borderColor: 'var(--brand-border)' }}>
                                                    <div className="font-bold mb-2 text-xs" style={{ color: 'var(--brand-primary-dark)' }}>🔑 Key Insights:</div>
                                                    <ul className="space-y-1 text-[10px]" style={{ color: 'var(--brand-primary-dark)' }}>
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
                                <TabsContent value="network" className="mt-0 animate-tab-enter">
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
                                                    Spatial proximity in the graph has no geographic or ideological meaning. Nimportode positions are determined by the force-directed layout algorithm to optimize visualization clarity.
                                                </InfoCard>
                                            </div>
                                        </div>
                                        <Screenshot src="/screenshots/network.png" alt="Network Graph Visualization" />
                                    </div>
                                </TabsContent>

                                {/* Export Tab */}
                                <TabsContent value="export" className="mt-0 animate-tab-enter">
                                    <div className="space-y-8">
                                        <div>
                                            <SectionTitle icon={Download}>Export Functionality</SectionTitle>
                                            <div className="space-y-4">
                                                <InfoCard title="CSV Export">
                                                    Exports two CSV files (organization table and asset table) in a ZIP archive. Organizations CSV includes names, types, descriptions, and funding sources. Assets CSV includes names, associated organizations, types, themes, donors, descriptions, and website.
                                                </InfoCard>
                                                <InfoCard title="Excel Export">
                                                    Export the same data as a professionally formatted Excel workbook. Includes organizations and assets sheets with styling and optimized column widths. Includes a README file with export metadata and current filter details.
                                                </InfoCard>
                                                <InfoCard title="Sharing & Reproducibility">
                                                    All exports respect your current filters (donors, investment types, themes, search query). The metadata and README file includes information about which filters were applied. Also, when sharing a link to the app, the same filters will be pre-applied for recipients, as the filter criteria are denoted in the URL.
                                    
                                                </InfoCard>
                                            </div>
                                        </div>
                                        <div>
                                            <SectionTitle icon={FileText}>Working with the Data</SectionTitle>
                                            <div className="space-y-4">
                                                <div>
                                                    
                                                    <CodeBlock code={`import pandas as pd
import zipfile
from pathlib import Path

# Extract CSV files from the downloaded ZIP
with zipfile.ZipFile('export.zip', 'r') as zip_ref:
    zip_ref.extractall('./data')

# Load the organizations and assets data
orgs_df = pd.read_csv('./data/organizations.csv')
assets_df = pd.read_csv('./data/assets.csv')

# Display basic info
print(f"Organizations: {len(orgs_df)} records")
print(f"Assets: {len(assets_df)} records")

# Filter by donor country
filtered = assets_df[assets_df['Donor Countries'].str.contains('[Example Country]', na=False)]
print(f"\\nAssets from [Example Country] donors: {len(filtered)}")

# Group assets by type
by_type = assets_df.groupby('Investment Type').size()
print(f"\\nAssets by type:\\n{by_type}")`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
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
                </Tabs>
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