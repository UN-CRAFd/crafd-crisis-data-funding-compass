/**
 * Shared StatCard Component
 * Unified statistics card used for displaying metrics across Analytics and Dashboard
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SectionHeader } from '../SectionHeader';
import { useTips } from '@/contexts/TipsContext';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    label: string;
    colorScheme: 'amber';
    tooltip?: React.ReactNode | string;
}

const STYLES = {
    statCard: "!border-0 transition-all duration-300 hover:ring-2 hover:ring-slate-300/50",
    chartTooltip: {
        backgroundColor: 'var(--tooltip-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: '10px',
        fontSize: '12px',
        padding: '8px',
        lineHeight: '0.8',
    }
} as const;

export const StatCard = React.memo(function StatCard({ icon, title, value, label, colorScheme, tooltip }: StatCardProps) {
    let tipsEnabled = false;
    try {
        const tipsContext = useTips();
        tipsEnabled = tipsContext.tipsEnabled;
    } catch (e) {
        tipsEnabled = false;
    }

    const gradients = {
        amber: {
            bg: 'from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]',
            value: 'text-[var(--brand-primary)]',
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
                <div className="flex items-baseline gap-2">
                    <div className={`text-4xl sm:text-5xl font-bold font-mono leading-none tabular-nums ${colors.value}`}>
                        {value}
                    </div>
                    <div className={`leading-none text-sm sm:text-lg font-medium ${colors.label}`}>
                        {label}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (tooltip && tipsEnabled) {
        return (
            <TooltipProvider delayDuration={0}>
                <TooltipUI>
                    <TooltipTrigger asChild>
                        {cardContent}
                    </TooltipTrigger>
                    <TooltipContent
                        side="bottom"
                        align="center"
                        className="max-w-100 p-3 bg-white text-slate-800 text-sm rounded-lg border border-slate-200"
                        sideOffset={5}
                        avoidCollisions={true}
                        style={{ ...STYLES.chartTooltip }}
                    >
                        {typeof tooltip === 'string' ? (
                            <p className="leading-relaxed">{tooltip}</p>
                        ) : (
                            <div className="leading-relaxed">{tooltip}</div>
                        )}
                    </TooltipContent>
                </TooltipUI>
            </TooltipProvider>
        );
    }

    return cardContent;
});
