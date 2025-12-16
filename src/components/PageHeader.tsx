'use client';

import { Button } from '@/components/ui/button';
import { TooltipContent, TooltipProvider, Tooltip as TooltipUI, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, FileDown, Info, MessageCircle, Share2, Menu, Lightbulb, LogOut, Home, BarChart3, BookOpen, Landmark } from 'lucide-react';
import { useTips } from '@/contexts/TipsContext';
import { useGeneralContributions } from '@/contexts/GeneralContributionsContext';
import { setGeneralContributionsEnabled } from '@/lib/data';
import labels from '@/config/labels.json';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STYLES = {
    chartTooltip: {
        backgroundColor: '#FFFFFF',
        color: '#333333',
        border: '1px solid #CBD5E1',
        borderRadius: '8px',
        padding: '12px',
    },
};

interface PageHeaderProps {
    onShare?: () => void;
    shareSuccess?: boolean;
    onExportCSV?: () => void;
    onExportXLSX?: () => void;
    csvExportLoading?: boolean;
    xlsxExportLoading?: boolean;
    pdfExportLoading?: boolean;
    exportMenuOpen?: boolean;
    onExportMenuChange?: (open: boolean) => void;
}

export default function PageHeader({
    onShare,
    shareSuccess = false,
    onExportCSV,
    onExportXLSX,
    csvExportLoading = false,
    xlsxExportLoading = false,
    pdfExportLoading = false,
    exportMenuOpen = false,
    onExportMenuChange,
}: PageHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Safely use useTips with fallback defaults
    let tipsEnabled = false;
    let setTipsEnabled: (enabled: boolean) => void = () => {};
    try {
        const tipsContext = useTips();
        tipsEnabled = tipsContext.tipsEnabled;
        setTipsEnabled = tipsContext.setTipsEnabled;
    } catch (e) {
        // TipsProvider not available (e.g., during prerendering)
        // Use default values
    }

    // Use General Contributions context - will render without provider as fallback
    let showGeneralContributions = true;
    let setShowGeneralContributionsLocal: (enabled: boolean) => void = () => {};
    
    try {
        const genContContext = useGeneralContributions();
        showGeneralContributions = genContContext.showGeneralContributions;
        setShowGeneralContributionsLocal = genContContext.setShowGeneralContributions;
    } catch (e) {
        // GeneralContributionsProvider not available - use defaults
    }

    const handleGeneralContributionsToggle = () => {
        const newValue = !showGeneralContributions;
        setShowGeneralContributionsLocal(newValue);
        setGeneralContributionsEnabled(newValue);
        // Refresh current route so views update without full page reload
        try {
            router.refresh();
        } catch (e) {
            // Fallback: full reload if router.refresh isn't available
            window.location.reload();
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <h1 className="text-lg sm:text-3xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                            <span className="qanelas-title">{labels.header.title}</span> <span className="font-roboto">{labels.header.subtitle}</span>
                        </h1>
                        <TooltipProvider>
                            <TooltipUI>
                                <TooltipTrigger asChild>
                                    <div
                                        className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-help bg-slate-100 border-slate-200 text-slate-600"
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
                                    className="max-w-115 p-1 bg-white text-slate-800 text-xs rounded-lg border border-slate-200"
                                    sideOffset={6}
                                    avoidCollisions={true}
                                    style={{ ...STYLES.chartTooltip }}
                                >
                                    <p className="leading-relaxed">{labels.header.betaTooltip}</p>
                                </TooltipContent>
                            </TooltipUI>
                        </TooltipProvider>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                        {/* Tips moved into Settings (see navigation menu) */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open('https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form', '_blank')}
                            className="bg-transparent rounded-md text-xs sm:text-sm px-4 py-4 text-slate-700 hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)] active:text-[var(--brand-primary)] transition"
                            title={labels.header.feedbackTooltip}
                        >
                            <MessageCircle className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">{labels.header.feedbackButton}</span>
                        </Button>
                        {pathname === '/' && (<div className="hidden sm:block w-px h-8 bg-slate-200"></div>)}

                        {/* Export Dropdown - only show on dashboard */}
                        {pathname === '/' && onExportCSV && onExportXLSX && (
                            <DropdownMenu onOpenChange={onExportMenuChange}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="hidden sm:flex bg-transparent rounded-md text-xs sm:text-sm px-4 py-4 text-slate-700 hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)] transition"
                                        title="Export current view"
                                    >
                                        <FileDown className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            {csvExportLoading ? labels.header.exportingCsv : xlsxExportLoading ? labels.header.exportingXlsx : pdfExportLoading ? labels.header.exportingPdf : labels.header.exportView}
                                        </span>
                                        <ChevronDown className={`ml-1.5 h-4 w-4 opacity-50 shrink-0 transform transition-transform ${
                                            exportMenuOpen ? 'rotate-180' : ''
                                        }`} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="end" 
                                    side="bottom"
                                    sideOffset={4}
                                    className="w-auto min-w-[200px] bg-white border border-slate-200 shadow-lg"
                                >
                                    <DropdownMenuItem
                                        onClick={onExportCSV}
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="cursor-pointer text-[11px] py-2"
                                    >
                                        <FileDown className="w-3 h-3 mr-2" />
                                        {labels.header.exportMenuCsv}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={onExportXLSX}
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="cursor-pointer text-[11px] py-2"
                                    >
                                        <FileDown className="w-3 h-3 mr-2" />
                                        {labels.header.exportMenuXlsx}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                        {/* Share Button */}
                        {onShare && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onShare}
                                    className={`bg-transparent rounded-md text-xs sm:text-sm px-4 py-4 text-slate-700 hover:text-[var(--brand-primary)] transition ${shareSuccess
                                        ? 'text-white bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] hover:text-slate-100'
                                        : ''
                                        }`}
                                style={shareSuccess ? { backgroundColor: 'var(--color-success)' } : {}}
                                title={labels.ui.copyToClipboard}
                            >
                                <Share2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{shareSuccess ? labels.header.shareButtonSuccess : labels.header.shareButton}</span>
                            </Button>
                        )}
                        
                    {/* Vertical line separator */}
                        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                        
                        {/* Page Navigation Menu - Rightmost */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="bg-transparent rounded-md text-xs sm:text-sm px-4 py-4 text-slate-700 hover:text-[var(--brand-primary)] transition"
                                    title="Navigation"
                                >
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                align="end" 
                                side="bottom"
                                sideOffset={4}
                                className="w-auto min-w-[180px] bg-white border border-slate-200 shadow-lg"
                            >
                                <DropdownMenuItem 
                                    onClick={() => {
                                        const raw = searchParams?.toString() || '';
                                        const params = new URLSearchParams(raw);

                                        // Ensure dashboard uses short keys expected by the dashboard wrapper
                                        // Map long keys to short ones if present
                                        if (params.has('types') && !params.has('t')) {
                                            params.set('t', params.get('types') || '');
                                            params.delete('types');
                                        }
                                        if (params.has('themes') && !params.has('th')) {
                                            params.set('th', params.get('themes') || '');
                                            params.delete('themes');
                                        }
                                        if (params.has('q') && !params.has('search')) {
                                            params.set('search', params.get('q') || '');
                                        }

                                        const target = params.toString() ? `/?${params.toString()}` : '/';
                                        router.push(target);
                                    }}
                                    className={`cursor-pointer text-sm py-2 px-2 ${pathname === '/' ? 'bg-slate-100' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <Home className="w-3 h-3 mr-2 text-slate-600" />
                                        <span className={pathname === '/' ? '!font-bold' : ''}>{labels.header.dashboard}</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => {
                                        const raw = searchParams?.toString() || '';
                                        const params = new URLSearchParams(raw);

                                        // Analytics expects 'types' and 'themes' and 'q'
                                        if (params.has('t') && !params.has('types')) {
                                            params.set('types', params.get('t') || '');
                                            // keep 't' for backwards compatibility
                                        }
                                        if (params.has('th') && !params.has('themes')) {
                                            params.set('themes', params.get('th') || '');
                                            // keep 'th' as well
                                        }
                                        if (params.has('search') && !params.has('q')) {
                                            params.set('q', params.get('search') || '');
                                        }

                                        const target = params.toString() ? `/analytics?${params.toString()}` : '/analytics';
                                        router.push(target);
                                    }}
                                    className={`cursor-pointer text-sm py-2 px-2 ${pathname === '/analytics' || pathname === '/analytics/' ? 'bg-slate-100' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <BarChart3 className="w-3 h-3 mr-2 text-slate-600" />
                                        <span className={pathname === '/analytics' || pathname === '/analytics/' ? '!font-bold' : ''}>Analytics</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => router.push('/methodology/')}
                                    className={`cursor-pointer text-sm py-2 px-2 ${pathname === '/methodology/' ? 'bg-slate-100' : ''}`}
                                >
                                    <div className="flex items-center">
                                        <BookOpen className="w-3 h-3 mr-2 text-slate-600" />
                                        <span className={pathname === '/methodology/' ? '!font-bold' : ''}>{labels.header.methodology}</span>
                                    </div>
                                </DropdownMenuItem>

                                {/* Settings block: Tips toggle + General Contributions toggle */}
                                <div className="border-t border-slate-100 mt-1 pt-2 px-2">
                                    <div className="text-xs font-semibold text-slate-600 mb-1">Settings</div>
                                    <div className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => setTipsEnabled(!tipsEnabled)}
                                            className="w-full text-left flex items-center gap-2 text-sm py-2 px-2 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Lightbulb className={`w-4 h-4 ${tipsEnabled ? '' : 'opacity-50'}`} />
                                            <span>{tipsEnabled ? labels.header.tipsOn : labels.header.tipsOff}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleGeneralContributionsToggle}
                                            className="w-full text-left flex items-center gap-2 text-sm py-2 px-2 text-slate-700 hover:bg-slate-50"
                                        >
                                            <Landmark className={`w-4 h-4 ${showGeneralContributions ? '' : 'opacity-50'}`} />
                                            <span>{showGeneralContributions ? 'General Contributions on' : 'General Contributions off'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 mt-1 pt-1">
                                    <DropdownMenuItem>
                                        <form action="/logout" method="post" className="w-full">
                                            <button type="submit" className="w-full text-left flex items-center gap-2 text-sm py-2 px-2 text-slate-700 hover:bg-slate-50">
                                                <LogOut className="w-4 h-4" />
                                                <span>Logout</span>
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                </div>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}
