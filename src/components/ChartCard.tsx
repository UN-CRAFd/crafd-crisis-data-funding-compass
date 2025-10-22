import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';

// Chart-specific styles
const CHART_STYLES = {
    cardGlass: "!border-0 bg-white/80 backdrop-blur-sm",
    sectionHeader: "flex items-center gap-2 text-lg font-qanelas-subtitle font-black text-slate-800 mb-0 mt-0 uppercase",
} as const;

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
}

const SectionHeader = ({ icon, title }: SectionHeaderProps) => (
    <div className={CHART_STYLES.sectionHeader}>
        <span className="h-6 w-6 flex items-center justify-center">
            {icon}
        </span>
        {title}
    </div>
);

interface ChartCardProps {
    title: string;
    icon: React.ReactNode;
    data: Array<{ name: string; value: number }>;
    barColor: string;
    footnote?: string;
}

interface LabelProps {
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
    value?: string | number;
    index?: number;
}

const ChartCard = React.memo(function ChartCard({ title, icon, data, barColor, footnote }: ChartCardProps) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = (_: unknown, index: number) => {
        // Clear any pending leave timeout to prevent hiding
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
        // Show immediately - no delay
        setHoveredIndex(index);
    };

    const handleMouseLeave = () => {
        // Only hide after a delay - this prevents flicker when moving between bars
        leaveTimeoutRef.current = setTimeout(() => {
            setHoveredIndex(null);
        }, 1000);
    };

    // Get the actual color value from CSS variable if it starts with 'var('
    const getColor = (color: string) => {
        if (typeof window !== 'undefined' && color.startsWith('var(')) {
            const varName = color.match(/var\((--[^)]+)\)/)?.[1];
            if (varName) {
                return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
            }
        }
        return color;
    };

    // Resolve color once for use in cells
    const resolvedColor = getColor(barColor);

    return (
        <Card className={`${CHART_STYLES.cardGlass} sticky top-28`}>
            <CardHeader className="pb-0 h-6.5">
                <CardTitle>
                    <SectionHeader icon={icon} title={title} />
                </CardTitle>
            </CardHeader>
            <CardContent
                className="pt-0 [&_svg]:outline-none [&_svg]:!border-0"
                onMouseLeave={() => {
                    if (leaveTimeoutRef.current) {
                        clearTimeout(leaveTimeoutRef.current);
                    }
                    setHoveredIndex(null);
                }}
            >
                <ResponsiveContainer width="100%" height={data.length * 35}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 0, right: 15, left: -50, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 12, dy: -2 }} tickLine={false} allowDecimals={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={240}
                            stroke="#64748b"
                            tick={{ fontSize: 13, dx: 1 }}
                            tickLine={false}
                        />
                        <Bar
                            dataKey="value"
                            radius={[0, 5, 5, 0]}
                            barSize={17}
                            style={{ transform: 'translateX(1px)', backgroundColor: resolvedColor }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            isAnimationActive={false}
                        >
                            {data.map((entry, index) => (
                                // Slightly vary lightness for each bar to create visual separation
                                <Cell
                                    key={`cell-${index}`}
                                    fill={(() => {
                                        const hex = getComputedStyle(document.documentElement)
                                            .getPropertyValue('--brand-primary')
                                            .trim();

                                        // Convert HEX → RGB
                                        const r = parseInt(hex.slice(1, 3), 16);
                                        const g = parseInt(hex.slice(3, 5), 16);
                                        const b = parseInt(hex.slice(5, 7), 16);

                                        // Lighten by percentage (relative to index)
                                        const lighten = index * 0.10;
                                        const newR = Math.min(255, Math.round(r + (255 - r) * lighten + 20));
                                        const newG = Math.min(255, Math.round(g + (255 - g) * lighten + 20));
                                        const newB = Math.min(255, Math.round(b + (255 - b) * lighten + 20));

                                        // Return the adjusted hex
                                        const toHex = (v: number) => v.toString(16).padStart(2, '0');
                                        return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
                                    })()}
                                    style={{
                                        zIndex: hoveredIndex === index ? 1000 : 1,
                                        position: 'relative',
                                        pointerEvents: 'all',
                                        transform: 'translateX(1px)'
                                    }}
                                />
                            ))}
                            <LabelList
                                dataKey="value"
                                position="right"
                                content={(props: LabelProps) => {
                                    const { x, y, width, height, value, index } = props;
                                    if (hoveredIndex !== index || x === undefined || y === undefined || width === undefined || height === undefined) return null;

                                    const xPos = typeof x === 'number' ? x : parseFloat(x);
                                    const yPos = typeof y === 'number' ? y : parseFloat(y);
                                    const w = typeof width === 'number' ? width : parseFloat(width);
                                    const h = typeof height === 'number' ? height : parseFloat(height);
                            

                                    // Calculate text width (rough estimate: 8px per character)
                                    const textWidth = String(value).length * 8;
                                    const minBarWidth = textWidth + 16; // Add some padding

                                    // Position inside bar if it's wide enough, otherwise outside
                                    const isInside = w > minBarWidth;
                                    const textX = isInside ? xPos + w - 8 : xPos + w + 8;
                                    
                                    const textAnchor = isInside ? 'end' : 'start';
                                    const textColor = '#333333'

                                    return (
                                        <text
                                            x={textX}
                                            y={yPos + h / 2 + 1.5}
                                            fill={textColor}
                                            fontSize={13}
                                            fontWeight={600}
                                            textAnchor={textAnchor}
                                            dominantBaseline="middle"
                                            style={{ 
                                                transition: 'none',
                                                opacity: 1,
                                                zIndex: 1001,
                                                textShadow: 'none'
                                            }}
                                        >
                                            {value}
                                        </text>
                                    );
                                }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                {footnote && (
                    <p className="text-[10px] text-slate-400 mt-2">
                        {footnote}
                    </p>
                )}
            </CardContent>
        </Card>
    );
});

ChartCard.displayName = 'ChartCard';

export default ChartCard;
