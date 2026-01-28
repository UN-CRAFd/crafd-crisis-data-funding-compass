import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { SectionHeader } from "./SectionHeader";

// Chart-specific styles
const CHART_STYLES = {
  cardGlass: "!border-0 bg-white",
} as const;

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
  value?: string | number | boolean | null | undefined;
  index?: number;
}

// Helper function to measure text width
const measureTextWidth = (text: string, fontSize: number = 13): number => {
  if (typeof document === "undefined") return text.length * 8; // Fallback for SSR
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * 8;
  
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial`;
  const metrics = ctx.measureText(text);
  return metrics.width;
};

const ChartCard = React.memo(function ChartCard({
  title,
  icon,
  data,
  barColor,
  footnote,
}: ChartCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [calculatedYAxisWidth, setCalculatedYAxisWidth] = useState<number>(240);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate optimal Y-axis width based on label content
  useEffect(() => {
    if (data.length === 0) return;

    // Measure all label widths
    const labelWidths = data.map((entry) =>
      measureTextWidth(entry.name, 13)
    );

    // Get the maximum width and add padding
    const maxLabelWidth = Math.max(...labelWidths);
    const padding = 16; // Padding on both sides
    const calculatedWidth = Math.max(
      maxLabelWidth + padding,
      100 // Minimum width
    );

    // Cap the maximum width to prevent extreme cases
    const finalWidth = Math.min(calculatedWidth, 320);

    setCalculatedYAxisWidth(finalWidth);
  }, [data]);

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
    // Hide immediately - no delay
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredIndex(null);
  };

  // Get the actual color value from CSS variable if it starts with 'var('
  const getColor = (color: string) => {
    if (typeof window !== "undefined" && color.startsWith("var(")) {
      const varName = color.match(/var\((--[^)]+)\)/)?.[1];
      if (varName) {
        return getComputedStyle(document.documentElement)
          .getPropertyValue(varName)
          .trim();
      }
    }
    return color;
  };

  // Resolve color once for use in cells
  const resolvedColor = getColor(barColor);

  // Calculate dynamic left margin to maintain proper spacing
  // Original: width=240, left=-49, so total offset = 191
  // Maintain the same ratio
  const originalWidth = 240;
  const originalMarginLeft = -17;
  const dynamicLeftMargin = Math.round(
    originalMarginLeft * (calculatedYAxisWidth / originalWidth)
  );

  return (
    <Card className={`${CHART_STYLES.cardGlass} sticky top-28`}>
      <CardHeader className="h-6.5 pb-0">
        <CardTitle>
          <SectionHeader icon={icon} title={title} />
        </CardTitle>
      </CardHeader>
      <CardContent
        className="pt-0 [&_svg]:!border-0 [&_svg]:outline-none"
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
            margin={{ top: 0, right: 10, left: dynamicLeftMargin, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid-stroke)"
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke="var(--chart-axis-stroke)"
              tick={{ fontSize: 12, dy: -2 }}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={calculatedYAxisWidth}
              stroke="var(--chart-axis-stroke)"
              tick={{ fontSize: 13, dx: 1 }}
              tickLine={false}
            />
            <Bar
              dataKey="value"
              radius={[0, 5, 5, 0]}
              barSize={17}
              style={{
                transform: "translateX(1px)",
                backgroundColor: resolvedColor,
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              // Re-enable animations for the bars and tune timing for a smooth entrance
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                // Slightly vary lightness for each bar to create visual separation
                <Cell
                  key={`cell-${index}`}
                  fill={(() => {
                    const hex = getComputedStyle(document.documentElement)
                      .getPropertyValue("--brand-primary")
                      .trim();

                    // Convert HEX → RGB
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);

                    // Lighten by percentage (relative to index)
                    const lighten = index * 0.1;
                    const newR = Math.min(
                      255,
                      Math.round(r + (255 - r) * lighten + 20),
                    );
                    const newG = Math.min(
                      255,
                      Math.round(g + (255 - g) * lighten + 20),
                    );
                    const newB = Math.min(
                      255,
                      Math.round(b + (255 - b) * lighten + 20),
                    );

                    // Return the adjusted hex
                    const toHex = (v: number) =>
                      v.toString(16).padStart(2, "0");
                    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
                  })()}
                  style={{
                    zIndex: hoveredIndex === index ? 1000 : 1,
                    position: "relative",
                    pointerEvents: "all",
                    transform: "translateX(1px)",
                  }}
                />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                content={(props: LabelProps) => {
                  const { x, y, width, height, value, index } = props;
                  const isVisible = hoveredIndex === index;

                  // Always render but control visibility with opacity for smooth transitions
                  if (
                    x === undefined ||
                    y === undefined ||
                    width === undefined ||
                    height === undefined
                  )
                    return null;

                  const xPos = typeof x === "number" ? x : parseFloat(x);
                  const yPos = typeof y === "number" ? y : parseFloat(y);
                  const w =
                    typeof width === "number" ? width : parseFloat(width);
                  const h =
                    typeof height === "number" ? height : parseFloat(height);

                  // Calculate text width (rough estimate: 8px per character)
                  const textWidth = String(value).length * 8;
                  const minBarWidth = textWidth + 16; // Add some padding

                  // Position on the left side of the bar when hovering
                  // Use the left edge of the bar + padding
                  const textX = xPos + 8; // 8px padding from left edge of bar
                  const textAnchor = "start";
                  // Use the same color as the chart axis/labels so the hovered
                  // value matches the rest of the chart text styling.
                  const textColor = "var(--chart-axis-stroke)";

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
                        opacity: isVisible ? 1 : 0,
                        zIndex: 1001,
                        pointerEvents: "none",
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
          <p className="mt-2 text-[10px] text-slate-400">{footnote}</p>
        )}
      </CardContent>
    </Card>
  );
});

ChartCard.displayName = "ChartCard";

export default ChartCard;
