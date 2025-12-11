'use client';

import { Button } from '@/components/ui/button';
import { TooltipContent, TooltipProvider, Tooltip as TooltipUI, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, FileDown, Info, MessageCircle, Share2, Menu, Lightbulb } from 'lucide-react';
import { useTips } from '@/contexts/TipsContext';
import labels from '@/config/labels.json';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

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
    logoutButton?: React.ReactNode;
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
    logoutButton,
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTipsEnabled(!tipsEnabled)}
                            className={`bg-slate-50/50 border-slate-200 text-xs sm:text-sm transition-colors ${
                                tipsEnabled
                                    ? 'hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-slate-600'
                                    : 'border-slate-300 bg-slate-200 text-slate-500'
                            }`}
                            title={tipsEnabled ? labels.header.tipsOn : labels.header.tipsOff}
                        >
                            <Lightbulb className={`w-4 h-4 sm:mr-2 ${tipsEnabled ? '' : 'opacity-50'}`} />
                            <span className="hidden sm:inline">{tipsEnabled ? labels.header.tipsOn : labels.header.tipsOff}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form', '_blank')}
                            className="bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm"
                            title={labels.header.feedbackTooltip}
                        >
                            <MessageCircle className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">{labels.header.feedbackButton}</span>
                        </Button>
                        
                        {/* Export Dropdown - only show on dashboard */}
                        {pathname === '/' && onExportCSV && onExportXLSX && (
                            <DropdownMenu onOpenChange={onExportMenuChange}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="hidden sm:flex bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm"
                                        title="Export current view"
                                    >
                                        <FileDown className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            {csvExportLoading ? labels.header.exportingCsv : xlsxExportLoading ? labels.header.exportingXlsx : pdfExportLoading ? labels.header.exportingPdf : labels.header.exportView}
                                        </span>
                                        <ChevronDown className={`ml-1.5 h-3 w-3 opacity-50 shrink-0 transform transition-transform ${
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
                        
                        {/* Share Button */}
                        {onShare && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onShare}
                                className={`bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm ${shareSuccess
                                    ? 'text-white border-[var(--color-success)] bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] hover:text-slate-100 hover:border-[var(--color-success-hover)]'
                                    : 'hover:var(--brand-bg-light)'
                                    }`}
                                style={shareSuccess ? { backgroundColor: 'var(--color-success)' } : {}}
                                title={labels.ui.copyToClipboard}
                            >
                                <Share2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{shareSuccess ? labels.header.shareButtonSuccess : labels.header.shareButton}</span>
                            </Button>
                        )}

                        {logoutButton}

                        {/* Page Navigation Menu - Rightmost */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm"
                                    title="Navigation"
                                >
                                    <Menu className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                                align="end" 
                                side="bottom"
                                sideOffset={4}
                                className="w-auto min-w-[180px] bg-white border border-slate-200 shadow-lg"
                            >
                                <DropdownMenuItem 
                                    onClick={() => router.push('/')}
                                    className={`cursor-pointer text-sm py-2 px-2 ${pathname === '/' ? 'bg-slate-100' : ''}`}
                                >
                                    <span className={pathname === '/' ? '!font-bold' : ''}>{labels.header.dashboard}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    onClick={() => router.push('/methodology/')}
                                    className={`cursor-pointer text-sm py-2 px-2 ${pathname === '/methodology/' ? 'bg-slate-100' : ''}`}
                                >
                                    <span className={pathname === '/methodology/' ? '!font-bold' : ''}>{labels.header.methodology}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    );
}
