'use client';

import { useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import labels from '@/config/labels.json';
import { BookOpen, Target, Database, GitBranch, Users, Lightbulb, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface MethodologyPageProps {
    logoutButton?: React.ReactNode;
}

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
            
            {/* Main Content - Add top padding to account for fixed header */}
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pt-20 sm:pt-24">
                <div className="space-y-4 sm:space-y-[var(--spacing-section)]">
                    
                    {/* Hero Section */}
                    <div className="bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] rounded-lg border border-slate-200 p-6 sm:p-8">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-lg border border-slate-200">
                                <BookOpen className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
                            </div>
                            <div className="flex-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3 qanelas-title">
                                    Methodology & Approach
                                </h1>
                                <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                                    This compass maps the ecosystem of data-related investments in humanitarian crises. Our methodology combines rigorous data collection, expert validation, and transparent classification to provide a comprehensive view of funding flows in the humanitarian data space.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="!border-0 bg-white hover:ring-2 hover:ring-slate-300/50 transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                    <CardTitle className="text-base font-bold text-slate-800 qanelas-subtitle uppercase">Objective</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Map funding flows and identify gaps in humanitarian data infrastructure to strengthen crisis response capabilities.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="!border-0 bg-white hover:ring-2 hover:ring-slate-300/50 transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Database className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                    <CardTitle className="text-base font-bold text-slate-800 qanelas-subtitle uppercase">Data Sources</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Primary research, public reports, institutional databases, and expert consultations across the humanitarian sector.
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="!border-0 bg-white hover:ring-2 hover:ring-slate-300/50 transition-all duration-300">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                    <CardTitle className="text-base font-bold text-slate-800 qanelas-subtitle uppercase">Collaboration</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Co-created with humanitarian organizations, donors, and data practitioners to ensure accuracy and relevance.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Methodology Tabs */}
                    <Card className="!border-0 bg-white">
                        <CardHeader>
                            <SectionHeader icon={<FileText style={{ color: 'var(--brand-primary)' }} />} title="Detailed Methodology" />
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="classification" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-1">
                                    <TabsTrigger value="classification">Classification</TabsTrigger>
                                    <TabsTrigger value="collection">Data Collection</TabsTrigger>
                                    <TabsTrigger value="validation">Validation</TabsTrigger>
                                    <TabsTrigger value="limitations">Limitations</TabsTrigger>
                                </TabsList>

                                <TabsContent value="classification" className="mt-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <GitBranch className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                            Investment Type Classification
                                        </h3>
                                        <p className="text-slate-600 mb-4 leading-relaxed">
                                            We categorize investments into six distinct types based on their primary purpose and outputs:
                                        </p>
                                        <div className="space-y-3">
                                            {[
                                                { type: 'Data Sets & Commons', desc: 'Shared repositories and standardized datasets enabling cross-sector analysis' },
                                                { type: 'Infrastructure & Platforms', desc: 'Technical systems supporting data collection, storage, and sharing' },
                                                { type: 'Crisis Analytics & Insights', desc: 'Analysis and modeling to inform response and preparedness' },
                                                { type: 'Human Capital & Know-how', desc: 'Training and capacity building for data practitioners' },
                                                { type: 'Standards & Coordination', desc: 'Common protocols and coordination mechanisms' },
                                                { type: 'Learning & Exchange', desc: 'Knowledge sharing and collaborative learning initiatives' }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                                    <div>
                                                        <p className="font-semibold text-slate-800 text-sm">{item.type}</p>
                                                        <p className="text-slate-600 text-xs mt-0.5">{item.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="collection" className="mt-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <Database className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                            Data Collection Process
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>1</span>
                                                    Primary Research
                                                </h4>
                                                <p className="text-slate-600 text-sm leading-relaxed ml-8">
                                                    Direct outreach to organizations, donors, and implementing partners to gather information on funded initiatives, investment amounts, and project details.
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>2</span>
                                                    Secondary Sources
                                                </h4>
                                                <p className="text-slate-600 text-sm leading-relaxed ml-8">
                                                    Analysis of public reports, annual statements, project databases, and documentation from humanitarian organizations and funding bodies.
                                                </p>
                                            </div>
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                                    <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand-primary)' }}>3</span>
                                                    Expert Validation
                                                </h4>
                                                <p className="text-slate-600 text-sm leading-relaxed ml-8">
                                                    Consultation with sector experts and practitioners to verify classifications, fill data gaps, and ensure contextual accuracy.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="validation" className="mt-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                            Quality Assurance & Validation
                                        </h3>
                                        <p className="text-slate-600 mb-4 leading-relaxed">
                                            Our multi-layered validation process ensures data accuracy and reliability:
                                        </p>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">Cross-Verification</p>
                                                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                                        Data points are verified against multiple sources to ensure consistency and accuracy before inclusion in the compass.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">Stakeholder Review</p>
                                                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                                        Organizations and donors review their entries to confirm accuracy of funding amounts, project descriptions, and classifications.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                                <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-sm">Continuous Updates</p>
                                                    <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                                                        The compass is regularly updated as new funding information becomes available and existing data is refined based on feedback.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="limitations" className="mt-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                            <AlertCircle className="w-5 h-5" style={{ color: 'var(--brand-primary)' }} />
                                            Known Limitations & Caveats
                                        </h3>
                                        <p className="text-slate-600 mb-4 leading-relaxed">
                                            We acknowledge the following limitations in our current methodology:
                                        </p>
                                        <div className="space-y-3">
                                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <p className="font-semibold text-slate-800 text-sm mb-1">Data Availability</p>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    Not all organizations publicly disclose funding amounts or project details. The compass represents known investments and may not capture the full scope of funding in this space.
                                                </p>
                                            </div>
                                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <p className="font-semibold text-slate-800 text-sm mb-1">Classification Complexity</p>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    Many projects span multiple investment types. We classify based on primary focus, which may not capture all aspects of multi-faceted initiatives.
                                                </p>
                                            </div>
                                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                                <p className="font-semibold text-slate-800 text-sm mb-1">Temporal Dynamics</p>
                                                <p className="text-slate-600 text-sm leading-relaxed">
                                                    Funding landscapes evolve rapidly. While we update regularly, there may be a lag between funding decisions and their reflection in the compass.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Contact Section */}
                    <Card className="!border-0 bg-gradient-to-br from-[var(--brand-bg-lighter)] to-white">
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="p-3 bg-white rounded-lg border border-slate-200">
                                    <Lightbulb className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2 qanelas-subtitle">
                                        Questions or Feedback?
                                    </h3>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        We welcome input from the humanitarian community to improve our methodology. If you have data to share, notice inaccuracies, or have suggestions for enhancement, please reach out through our feedback form.
                                    </p>
                                </div>
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
