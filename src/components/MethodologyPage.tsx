'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import labels from '@/config/labels.json';
import { 
    BookOpen, 
    Database, 
    CheckCircle2, 
    AlertTriangle,
    Target,
    Layers,
    Users,
    Globe,
    FileText,
    Search,
    MessageCircle,
    TrendingUp,
    Shield
} from 'lucide-react';

interface MethodologyPageProps {
    logoutButton?: React.ReactNode;
}

// Consolidated style constants matching CrisisDataDashboard
const STYLES = {
    cardGlass: "!border-0 bg-white",
    sectionHeader: "flex items-center gap-2 text-lg font-qanelas-subtitle font-black text-slate-800 mb-0 mt-0 uppercase",
} as const;

export default function MethodologyPage({ logoutButton }: MethodologyPageProps) {
    const [shareSuccess, setShareSuccess] = useState(false);

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
                                <h1 className="text-3xl sm:text-4xl font-bold font-qanelas-subtitle" style={{ color: 'var(--brand-primary)' }}>
                                    Methodology
                                </h1>
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 max-w-3xl leading-relaxed">
                                Understand how we derive insights for crisis data funding through systematic data collection, classification, validation, and interactive analysis.
                            </p>
                        </div>
                    </div>

                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="!border-0 bg-white hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle>
                                <SectionHeader
                                    icon={<Target style={{ color: 'var(--brand-primary)' }} />}
                                    title="Objective"
                                />
                            </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Provide transparent, systematic insights into crisis data funding to support evidence-based decision-making in the humanitarian sector.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="!border-0 bg-white hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle>
                                <SectionHeader
                                    icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                                    title="Data Sources"
                                />
                            </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Aggregated from public portals, international organizations, and partner sources with automated and manual curation.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="!border-0 bg-white hover:shadow-lg transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle>
                                <SectionHeader
                                    icon={<Users style={{ color: 'var(--brand-primary)' }} />}
                                    title="Collaboration"
                                />
                            </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Built with community feedback and expert review to ensure data quality and relevance.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Methodology Content */}
                    <Card className={STYLES.cardGlass}>
                        <CardHeader className="-pb-0">
                            <CardTitle>
                                <SectionHeader
                                    icon={<Layers style={{ color: 'var(--brand-primary)' }} />}
                                    title="Detailed Methodology"
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <Tabs defaultValue="collection" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2 bg-slate-50 p-2">
                                    <TabsTrigger 
                                        value="collection" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <Search className="w-4 h-4 mr-2" />
                                        Collection
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="classification" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Classification
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="validation" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Validation
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="filtering" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <Layers className="w-4 h-4 mr-2" />
                                        Filtering
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="network" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Network
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="limitations" 
                                        className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm"
                                    >
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        Limitations
                                    </TabsTrigger>
                                </TabsList>

                                {/* Data Collection Tab */}
                                <TabsContent value="collection" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <Search className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Data Collection
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                        1
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800">Source Identification</h4>
                                                </div>
                                                <p className="text-sm text-slate-600 ml-11 leading-relaxed">
                                                    We aggregate data from a curated set of public and partner sources, including international organizations, government portals, and open data repositories relevant to crisis funding and humanitarian response.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                        2
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800">Automated & Manual Gathering</h4>
                                                </div>
                                                <p className="text-sm text-slate-600 ml-11 leading-relaxed">
                                                    Data is collected through a combination of automated pipelines (APIs, web scraping) and manual curation to ensure completeness and accuracy.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                        3
                                                    </div>
                                                    <h4 className="font-semibold text-slate-800">Regular Updates</h4>
                                                </div>
                                                <p className="text-sm text-slate-600 ml-11 leading-relaxed">
                                                    The dataset is refreshed periodically to capture new funding flows, projects, and organizational changes.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Data Collection Process</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Classification Tab */}
                                <TabsContent value="classification" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <FileText className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Data Classification
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Entity Mapping</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Organizations, donors, and projects are mapped to unique identifiers to avoid duplication and enable cross-referencing.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Investment Typing</h4>
                                                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                                                    Each project is classified into one or more investment types based on project descriptions and metadata:
                                                </p>
                                                <ul className="space-y-2 text-sm text-slate-600">
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Data Sets & Commons</strong></span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Infrastructure & Platforms</strong></span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Crisis Analytics & Insights</strong></span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Human Capital & Know-how</strong></span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Standards & Coordination</strong></span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="font-semibold min-w-fit" style={{ color: 'var(--brand-primary)' }}>•</span>
                                                        <span><strong>Learning & Exchange</strong></span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Theme Tagging</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Projects are tagged with thematic areas (e.g., health, displacement, food security) using keyword analysis and expert review.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Investment Types & Theme Classification</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Validation Tab */}
                                <TabsContent value="validation" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Data Validation
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <Shield className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                                                    Quality Assurance
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Automated checks flag inconsistencies, missing fields, and outliers. Manual review is conducted for high-impact records and edge cases.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                                                    Source Verification
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Where possible, funding flows and project details are cross-checked against original sources or official reports.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <Users className="w-4 h-4" style={{ color: 'var(--brand-primary)' }} />
                                                    Community Feedback
                                                </h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Users can suggest corrections or flag issues, which are reviewed by the data team.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Quality Assurance & Validation Process</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Filtering & Query Tab */}
                                <TabsContent value="filtering" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <Layers className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Filtering & Query
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Search Logic</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Search operates on project titles and organization names.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Donor Filter</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Multiple donors trigger a conjunction. Returned projects must be co-financed by every selected donor.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Type Filter</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Multiple types trigger a disjunction. Organizations appear if any of their projects match at least one selected type.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Theme Filter</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Themes function under conjunction. Returned projects must include all selected themes.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Type–Theme Relationship</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Themes are nested under types. Selecting a type restricts theme options to those linked to that type. Themes from other types can still surface when projects span multiple types and carry overlapping themes.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Filter Logic & Query Interface</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Network Analysis Tab */}
                                <TabsContent value="network" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Network Analysis
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Graph Structure</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    The network view displays the filtered dataset as an undirected graph, showing relationships between donors, organizations, and projects.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Clustering Options</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Clustering options aggregate projects and organizations by type, making it easier to identify patterns and connections within specific investment categories.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Interactive Nodes</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Project and organization nodes are interactive and open a detail modal when clicked, providing in-depth information about entities and their relationships.
                                                </p>
                                            </div>

                                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Spatial Interpretation</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Spatial proximity in the graph has no geographic or ideological meaning. Node positions are determined by the force-directed layout algorithm to optimize visualization clarity.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Network Graph Visualization</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Limitations Tab */}
                                <TabsContent value="limitations" className="mt-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                                Limitations
                                            </h3>
                                            <div className="space-y-4">
                                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Data Gaps</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Not all funding flows or projects are publicly reported; some data may be incomplete or delayed.
                                                </p>
                                            </div>

                                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Classification Subjectivity</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    Investment type and theme assignments may involve interpretation, especially for multi-sector projects.
                                                </p>
                                            </div>

                                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                                <h4 className="font-semibold text-slate-800 mb-2">Simplification</h4>
                                                <p className="text-sm text-slate-600 leading-relaxed">
                                                    For clarity, some visualizations (e.g., UN donor lists) are simplified and do not reflect the full complexity of funding relationships.
                                                </p>
                                            </div>
                                        </div>
                                        </div>
                                        
                                        {/* Image Placeholder */}
                                        <div className="bg-slate-100 rounded-lg p-8 border border-slate-200 flex items-center justify-center min-h-[400px]">
                                            <p className="text-slate-400 text-sm">Screenshot: Data Coverage & Known Limitations</p>
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