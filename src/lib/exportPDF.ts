import jsPDF from "jspdf";
import type {
  DashboardStats,
  ProjectTypeData,
  OrganizationTypeData,
  OrganizationWithProjects,
} from "@/types/airtable";

interface ExportPDFParams {
  stats: DashboardStats;
  projectTypes: ProjectTypeData[];
  organizationTypes: OrganizationTypeData[];
  organizationsWithProjects: OrganizationWithProjects[];
  getFilterDescription: () => string;
}

/**
 * Exports the dashboard data to a professionally formatted PDF briefing document
 */
export async function exportDashboardToPDF({
  stats,
  projectTypes,
  organizationTypes,
  organizationsWithProjects,
  getFilterDescription,
}: ExportPDFParams): Promise<void> {
  // Create PDF in portrait mode, A4 size
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Constants for layout
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Brand colors
  const brandPrimary = "#E6AF26"; // Amber
  const brandPrimaryDark = "#BC840F";
  const brandBgLight = "#FCF0D6";
  const textDark = "#1E293B"; // slate-800
  const textMedium = "#475569"; // slate-600
  const textLight = "#94A3B8"; // slate-400

  let yPosition = margin;

  // Helper: Add text with word wrap
  const addWrappedText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number = 6,
  ): number => {
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return y + lines.length * lineHeight;
  };

  // Helper: Draw a horizontal bar chart
  const drawBarChart = (
    startY: number,
    data: Array<{ name: string; value: number }>,
    title: string,
    maxBarWidth: number = contentWidth * 0.5,
  ): number => {
    let currentY = startY;

    // Chart title
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textDark);
    pdf.text(title, margin, currentY);
    currentY += 6;

    if (data.length === 0) {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(textMedium);
      pdf.text("No data available", margin, currentY);
      return currentY + 8;
    }

    // Find max value for scaling
    const maxValue = Math.max(...data.map((d) => d.value));

    // Draw bars
    pdf.setFontSize(8);

    data.forEach((item, index) => {
      if (currentY > pageHeight - 40) {
        pdf.addPage();
        currentY = margin;
      }

      const barHeight = 4.5;
      const labelWidth = contentWidth * 0.4;
      const barStartX = margin + labelWidth;
      const barWidth = (item.value / maxValue) * maxBarWidth;

      // Draw label - bold for all items
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(textDark);
      const truncatedName =
        item.name.length > 40 ? item.name.substring(0, 37) + "..." : item.name;
      pdf.text(truncatedName, margin, currentY + 3.2);

      // Draw bar with subtle shadow effect
      pdf.setFillColor("#F1F5F9"); // slate-100
      pdf.roundedRect(barStartX, currentY, maxBarWidth, barHeight, 1, 1, "F");

      // Draw bar
      if (item.value > 0) {
        // Create gradient effect with multiple rectangles
        const gradient = [
          { color: brandPrimary, width: barWidth },
          { color: brandPrimaryDark, width: barWidth * 0.3 },
        ];

        pdf.setFillColor(brandPrimary);
        pdf.roundedRect(barStartX, currentY, barWidth, barHeight, 1, 1, "F");
      }

      // Draw value with background
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(brandPrimaryDark);
      pdf.text(
        item.value.toString(),
        barStartX + maxBarWidth + 2,
        currentY + 3.2,
      );

      currentY += barHeight + 2;
    });

    return currentY + 4;
  };

  // ===== HEADER =====
  // Title background with gradient effect
  pdf.setFillColor(brandPrimary);
  pdf.rect(0, 0, pageWidth, 40, "F");

  // Add subtle darker stripe at top
  pdf.setFillColor(brandPrimaryDark);
  pdf.rect(0, 0, pageWidth, 2, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(26);
  pdf.setFont("helvetica", "bold");
  pdf.text("CRISIS DATA", margin, 16);

  pdf.setFontSize(20);
  pdf.setFont("helvetica", "normal");
  pdf.text("Funding Compass", margin, 28);

  // Subtitle with date
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Summary Document", pageWidth - margin, 20, { align: "right" });
  pdf.setFontSize(8);
  pdf.text(currentDate, pageWidth - margin, 26, { align: "right" });

  yPosition = 50;

  // Filter description box with border
  const filterDesc = getFilterDescription();
  pdf.setFillColor(brandBgLight);
  const filterBoxHeight = 12;
  pdf.roundedRect(margin, yPosition, contentWidth, filterBoxHeight, 2, 2, "F");
  pdf.setDrawColor(brandPrimary);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(margin, yPosition, contentWidth, filterBoxHeight, 2, 2, "S");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandPrimaryDark);
  yPosition = addWrappedText(
    filterDesc,
    margin + 3,
    yPosition + 4.5,
    contentWidth - 6,
    4.5,
  );
  yPosition += 8;

  // ===== KEY STATISTICS =====
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandPrimaryDark);
  pdf.text("KEY STATISTICS", margin, yPosition);
  yPosition += 7;

  // Statistics cards in a row with shadow effect
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 26;
  const cardSpacing = 5;

  const statCards = [
    {
      label: "Donors",
      value: stats.donorCountries,
      subtitle: "Where funds are from",
    },
    {
      label: "Organizations",
      value: stats.dataProviders,
      subtitle: "Who receives funds",
    },
    {
      label: "Assets",
      value: stats.dataProjects,
      subtitle: "What funds are used for",
    },
  ];

  statCards.forEach((card, index) => {
    const cardX = margin + index * (cardWidth + cardSpacing);

    // Shadow effect
    pdf.setFillColor(220, 220, 220);
    pdf.roundedRect(
      cardX + 0.5,
      yPosition + 0.5,
      cardWidth,
      cardHeight,
      3,
      3,
      "F",
    );

    // Card background with gradient simulation
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, "F");

    // Top accent bar
    pdf.setFillColor(brandPrimary);
    pdf.roundedRect(cardX, yPosition, cardWidth, 3, 3, 3, "F");

    // Border
    pdf.setDrawColor(brandPrimary);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(cardX, yPosition, cardWidth, cardHeight, 3, 3, "S");

    // Value (large, centered)
    pdf.setFontSize(22);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandPrimaryDark);
    pdf.text(card.value.toString(), cardX + cardWidth / 2, yPosition + 13, {
      align: "center",
    });

    // Label
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(textDark);
    pdf.text(card.label, cardX + cardWidth / 2, yPosition + 19, {
      align: "center",
    });

    // Subtitle
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(textMedium);
    const subtitleLines = pdf.splitTextToSize(card.subtitle, cardWidth - 4);
    pdf.text(subtitleLines, cardX + cardWidth / 2, yPosition + 23, {
      align: "center",
    });
  });

  yPosition += cardHeight + 12;

  // ===== CHARTS SECTION =====
  // Check if we need a new page
  if (yPosition > pageHeight - 100) {
    pdf.addPage();
    yPosition = margin;
  }

  // Section header without decoration
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(brandPrimaryDark);
  pdf.text("BREAKDOWN BY CATEGORY", margin, yPosition);
  yPosition += 2;

  // Decorative line
  pdf.setDrawColor(brandPrimary);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  pdf.setDrawColor(brandBgLight);
  pdf.setLineWidth(1.5);
  pdf.line(margin, yPosition + 0.5, pageWidth - margin, yPosition + 0.5);
  yPosition += 8;

  // Organizations by Type Chart
  const topOrgTypes = organizationTypes
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) // Reduced from 8 to 6
    .map((item) => ({ name: item.name, value: item.count }));

  yPosition = drawBarChart(yPosition, topOrgTypes, "Organizations by Type");
  yPosition += 6; // Add extra space between charts

  // Check if we need a new page
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = margin;
  }

  // Assets by Type Chart
  const topProjectTypes = projectTypes
    .sort((a, b) => b.count - a.count)
    .slice(0, 6) // Reduced from 8 to 6
    .map((item) => ({ name: item.name, value: item.count }));

  yPosition = drawBarChart(yPosition, topProjectTypes, "Assets by Type");

  // ===== FOOTER =====
  const addFooter = (pageNumber: number) => {
    const footerY = pageHeight - 12;

    // Decorative top border with double line
    pdf.setDrawColor(brandPrimary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
    pdf.setDrawColor(brandBgLight);
    pdf.setLineWidth(0.2);
    pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    // Footer text
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(textMedium);

    // Left: Data source with icon
    pdf.setFillColor(brandPrimary);
    pdf.circle(margin + 1, footerY - 0.8, 0.8, "F");
    pdf.setTextColor(textMedium);
    pdf.text("Complex Risk Analytics Fund (CRAF'd)", margin + 3.5, footerY);

    // Right: Page number with elegant styling
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(brandPrimaryDark);
    pdf.text(`${pageNumber}`, pageWidth - margin, footerY, { align: "right" });
  };

  // Add footer to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(i);
  }

  // ===== METADATA =====
  pdf.setProperties({
    title: "Crisis Data Funding Compass - Briefing",
    subject: "Dashboard Export",
    author: "Complex Risk Analytics Fund (CRAF'd)",
    keywords: "crisis data, funding, compass, dashboard",
    creator: "Crisis Data Funding Compass",
  });

  // ===== SAVE =====
  const timestamp = new Date().toISOString().split("T")[0];
  pdf.save(`crisis-data-funding-compass-${timestamp}.pdf`);
}
