import type { DashboardStats, OrganizationTypeData, OrganizationWithProjects, ProjectTypeData } from '../types/airtable';

interface ExportPDFOptions {
    stats: DashboardStats;
    projectTypes: ProjectTypeData[];
    organizationTypes: OrganizationTypeData[];
    organizationsWithProjects?: OrganizationWithProjects[];
    getFilterDescription: () => string;
}

export async function exportDashboardToPDF({
    stats,
    projectTypes,
    organizationTypes,
    organizationsWithProjects: _organizationsWithProjects,
    getFilterDescription
}: ExportPDFOptions): Promise<void> {
    try {
        const jsPDFModule = await import('jspdf');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsPDF = (jsPDFModule as any).jsPDF ?? (jsPDFModule as any).default ?? jsPDFModule;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });

        // === IMPORTANT ROBOTO FONT SETUP ===
        // To use Roboto you need to embed/register it with jsPDF:
        // 1) Convert roboto-regular.ttf and roboto-bold.ttf to base64 and add using:
        //    (doc as any).addFileToVFS('Roboto-Regular.ttf', '<BASE64_STRING>');
        //    (doc as any).addFileToVFS('Roboto-Bold.ttf', '<BASE64_STRING>');
        // 2) Then register:
        //    (doc as any).addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        //    (doc as any).addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
        // 3) After that call setFont('Roboto') below.
        //
        // If you don't embed Roboto, the code falls back to Helvetica.
        //
        // Uncomment and fill the VFS lines above in your build pipeline or preload step.
        //
        // Example (uncomment when you have embedded fonts):
        // doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR_BASE64);
        // doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD_BASE64);
        // doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        // doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

        // Use Roboto if registered; else fallback to helvetica.
        const baseFont = 'Helvetica';

        // Small reference to unused param to satisfy lint when optional
        const _orgCount = Array.isArray(_organizationsWithProjects) ? _organizationsWithProjects.length : 0;

        // Page layout
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 36;
        const columnGap = 20;
        const contentWidth = pageWidth - margin * 2 - columnGap;
        const leftColWidth = contentWidth * 0.66;
        const rightColWidth = contentWidth * 0.34;
        const leftColX = margin;
        const rightColX = margin + leftColWidth + columnGap + 5;

        // Typographic scale
        const TYPE = {
            display: 28,
            subtitle: 11.5,
            h1: 12.5,
            h2: 10.5,
            body: 9.5,
            small: 7.5,
            tiny: 6.5,
        };

        // Brand color palette from globals.css
        // These values should match the CSS variables in src/app/globals.css
        const hexToRgb = (hex: string) => {
            // Remove leading # if present
            hex = hex.replace(/^#/, '');
            // Handle shorthand hex
            if (hex.length === 3) {
                hex = hex.split('').map(x => x + x).join('');
            }
            const num = parseInt(hex, 16);
            return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
        };

        const COLORS = {
            unBlue: hexToRgb('#1FBBEE'), // --brand-primary
            darkText: hexToRgb('#1e293b'), // --color-surface-dark (text-slate-800)
            mutedText: hexToRgb('#64748b'), // --color-secondary (text-slate-500)
            lightText: hexToRgb('#94a3b8'), // text-slate-400
            divider: hexToRgb('#9DE5FF'), // --brand-border
            lightBg: hexToRgb('#F0FBFF'), // --brand-bg-lighter
            chartBlue: hexToRgb('#1FBBEE'), // --brand-primary
            chartGreen: hexToRgb('#16B981'), // emerald-500
            chartOrange: hexToRgb('#f59e0b'), // --color-warning
            cardBg: hexToRgb('#E0F7FF'), // --color-surface (brand card background)
            cardBorder: hexToRgb('#9DE5FF'), // --brand-border
            cardText: hexToRgb('#1e293b'), // --color-surface-dark
            cardMuted: hexToRgb('#64748b'), // --color-secondary
        };

        // Helper: set font
        const setFont = (size: number, bold = false) => {
            doc.setFont(baseFont, bold ? 'bold' : 'normal');
            doc.setFontSize(size);
        };

        // Position tracking
        let leftY = margin + 8;
        let rightY = margin + 8;

        // Sync columns to avoid overlap: always call before rendering column-specific blocks
        const syncColumns = () => {
            const maxY = Math.max(leftY, rightY);
            leftY = maxY;
            rightY = maxY;
        };

        // Draw heading underline full left column width
        const addFullUnderlineHeading = (text: string, x: number, y: number, size = TYPE.h1) => {
            const underlineStart = leftColX;
            const underlineEnd = leftColX + leftColWidth;
            doc.setDrawColor(...COLORS.unBlue);
            doc.setLineWidth(1.2);
            doc.line(underlineStart, y + 6, underlineEnd, y + 6);
            y += 20;


            setFont(size, true);
            doc.setTextColor(...COLORS.unBlue);
            doc.text(text, x, y);

            // Underline spans full left column width (not only text width)

            return y + size * 1.6;
        };

        // JUSTIFYING HELPER
        // Splits text into lines that fit maxWidth using jsPDF, then renders each line justified by distributing extra space.
        const addJustifiedText = (text: string, x: number, yStart: number, maxWidth: number, fontSize = TYPE.body, indent = 0) => {
            // Set font size (we assume font already set by caller)
            doc.setFontSize(fontSize);

            // Use splitTextToSize to obtain wrapped lines
            const rawLines = doc.splitTextToSize(text, maxWidth - indent - 2); // slightly smaller to avoid overflow
            let y = yStart;
            const lineHeight = fontSize * 1.32;

            for (let i = 0; i < rawLines.length; i++) {
                const line = String(rawLines[i]);
                // Last line should be left-aligned (not justified)
                const isLast = i === rawLines.length - 1;
                const lineX = x + indent;

                if (!isLast) {
                    // For justification: distribute extra space across gaps between words
                    const words = line.split(/\s+/).filter(Boolean);
                    if (words.length === 0) {
                        // empty line: skip
                        y += lineHeight;
                        continue;
                    } else if (words.length === 1) {
                        // single word: left align
                        doc.text(words[0], lineX, y);
                    } else {
                        // compute widths
                        const wordsWidths = words.map(w => doc.getTextWidth(w));
                        const wordsWidthSum = wordsWidths.reduce((a, b) => a + b, 0);
                        const totalGapWidth = maxWidth - indent - 2 - wordsWidthSum;
                        const gap = totalGapWidth / (words.length - 1);

                        // render words manually
                        let cursorX = lineX;
                        for (let wi = 0; wi < words.length; wi++) {
                            doc.text(words[wi], cursorX, y);
                            cursorX += wordsWidths[wi] + gap;
                        }
                    }
                } else {
                    // last line - left aligned; preserve normal spacing
                    doc.text(line, lineX, y);
                }

                y += lineHeight;
            }
            return (rawLines.length * lineHeight);
        };

        // Small helper to add small left-indent bullet + justified text
        const addJustifiedBullet = (indexLabel: string, text: string) => {
            setFont(TYPE.body, true);
            doc.setTextColor(...COLORS.unBlue);
            doc.text(indexLabel, leftColX, leftY);
            setFont(TYPE.body, false);
            doc.setTextColor(...COLORS.darkText);
            const consumed = addJustifiedText(text, leftColX + 18, leftY, leftColWidth - 18, TYPE.body, 0);
            leftY += consumed + 6;
            syncColumns();
        };

        // Header background
        doc.setFillColor(...COLORS.lightBg);
        doc.rect(0, 0, pageWidth, 90, 'F');

        // ===== LEFT: Main title & subtitle
        setFont(TYPE.display, true);
        doc.setTextColor(...COLORS.darkText);
        doc.text('Crisis Data Funding', leftColX, leftY + 10);

        setFont(TYPE.subtitle, false);
        doc.setTextColor(...COLORS.unBlue);
        const subtitle = 'Funding Briefing: Towards a Coordinated Approach to Data & Human Rights in Crisis Contexts';
        doc.text(subtitle, leftColX, leftY + 30);
        leftY += 56;

        // Thin divider
        doc.setDrawColor(...COLORS.divider);
        doc.setLineWidth(0.6);
        doc.line(leftColX, leftY, leftColX + leftColWidth - 10, leftY);
        leftY += 15;
        rightY = leftY;

        // Filter context as briefing-style sentence
        const filterDesc = getFilterDescription();
        const hasFilters = filterDesc !== 'Showing all projects';
        if (hasFilters) {
            setFont(TYPE.small, false);
            doc.setTextColor(...COLORS.mutedText);
            const filterText = `Briefing by the United Nations, ${filterDesc.replace('Showing ', 'data including ')}`;
            const used = addJustifiedText(filterText, leftColX, leftY, leftColWidth, TYPE.small, 0);
            leftY += used + 20;
            syncColumns();
        }

        // ===== LEFT: Challenge heading + justified body
        leftY += 6;
        leftY = addFullUnderlineHeading('CHALLENGE: UNPREDICTABLE SUPPORT', leftColX, leftY, TYPE.h1);


        setFont(TYPE.body, false);
        doc.setTextColor(...COLORS.darkText);
        const challengeText = hasFilters
            ? `Analysis of the current filtered portfolio of ${stats.dataProjects} data ${stats.dataProjects === 1 ? 'project' : 'projects'} funded by ${stats.dataProviders} ${stats.dataProviders === 1 ? 'organization' : 'organizations'} across ${stats.donorCountries} donor ${stats.donorCountries === 1 ? 'country' : 'countries'} reveals recurring fragmentation. Teams work thematically and sectorally with limited cross-coordination, producing duplicated effort and inconsistent support for rights-sensitive activities.`
            : `Across the crisis data landscape, ${stats.dataProjects} active data ${stats.dataProjects === 1 ? 'project' : 'projects'} — supported by ${stats.dataProviders} organizations across ${stats.donorCountries} donor ${stats.donorCountries === 1 ? 'country' : 'countries'} — show that thematic, siloed approaches remain dominant. This limits cumulative impact, creates competition for scarce resources, and leaves rights considerations inconsistently applied.`;
        const consumedChallenge = addJustifiedText(challengeText, leftColX, leftY, leftColWidth, TYPE.body, 0);
        leftY += consumedChallenge + 8;
        syncColumns();

        // ===== RIGHT: Key Figures (cards)
        rightY -= 90;
        setFont(TYPE.h2, true);
        doc.setTextColor(...COLORS.darkText);
        doc.text('Funding of Projects', rightColX, rightY);

        rightY += TYPE.h2 * 1.3;

        const cardHeight = 30;
        const cardGap = 10;
        const cardWidth = rightColWidth - 4;


        [
            { label: 'Data projects', value: stats.dataProjects, color: COLORS.chartBlue },
            { label: 'Organizations', value: stats.dataProviders, color: COLORS.chartGreen },
            { label: 'Donor countries', value: stats.donorCountries, color: COLORS.chartOrange },
        ].forEach((stat, idx) => {
            const y = rightY + idx * (cardHeight + cardGap);

            // Card background and border
            doc.setFillColor(...COLORS.cardBg);
            doc.setDrawColor(...COLORS.cardBorder);
            doc.roundedRect(rightColX, y, cardWidth, cardHeight, 4, 4, 'FD');

            // Card accent bar
            doc.setFillColor(...stat.color);
            doc.rect(rightColX, y, 5, cardHeight, 'F');

            // Card value (text)
            setFont(18, true);
            doc.setTextColor(...stat.color);
            doc.text(String(stat.value), rightColX + 10, y + 26);

            // Card label (muted text)
            setFont(TYPE.small, false);
            doc.setTextColor(...COLORS.cardMuted);
            doc.text(stat.label, rightColX + 10 + doc.getTextWidth(String(stat.value)) + 20, y + 26);
        });

        rightY += 3 * (cardHeight + cardGap) + 12;
        syncColumns();

        // ===== LEFT: Goal section^
        leftY -= 40;

        leftY = addFullUnderlineHeading('GOAL: UNIFIED APPROACH TO HUMAN RIGHTS', leftColX, leftY, TYPE.h1);
        leftY += 6;
        setFont(TYPE.body, false);
        doc.setTextColor(...COLORS.darkText);
        const goalText = `Drive a single, system-wide coordination mechanism so human rights considerations are embedded into program design, funding decisions, and operational delivery. This reduces duplication, ensures consistent safeguards, and magnifies the impact of investments in crisis data.`;
        const consumedGoal = addJustifiedText(goalText, leftColX, leftY, leftColWidth, TYPE.body, 0);
        leftY += consumedGoal + 28;
        syncColumns();

        // ===== LEFT: Areas for action (numbered, justified bodies)
        leftY = addFullUnderlineHeading('AREAS FOR ACTION', leftColX, leftY, TYPE.h1);
        leftY += 6;

        const actionItems = [
            'Form a cross-UN Crisis Data & Rights Group to harmonize policy and priorities, chaired at senior level.',
            'Adopt unified standards for data collection, sharing and protection that are applied across humanitarian and development work.',
            'Mainstream human rights checks into project approval and monitoring processes, with clear responsibilities.',
            'Establish shared platforms for coordination to reduce duplication and enable rapid, ethical data use in crises.'
        ];

        actionItems.forEach((item, idx) => {
            addJustifiedBullet(`${idx + 1}.`, item);
        });

        // ===== RIGHT: Project focus areas (UN-style bars)
        leftY -= 90;
        rightY -= 190;
        setFont(TYPE.h2, true);
        doc.setTextColor(...COLORS.darkText);
        doc.text('Project focus areas', rightColX, rightY);
        rightY += TYPE.h2 * 1.6;

        const topProjectTypes = projectTypes.slice(0, 6);
        const maxProjectValue = Math.max(...topProjectTypes.map(pt => pt.count), 1);
        const chartBarWidth = rightColWidth - 62;
        const barHeight = 6;
        const barSpacing = 16;

        topProjectTypes.forEach((pt, idx) => {
            const barY = rightY + idx * barSpacing;

            setFont(TYPE.tiny, false);
            doc.setTextColor(...COLORS.cardText);
            const labelText = pt.name.length > 18 ? pt.name.substring(0, 15) + '...' : pt.name;
            doc.text(labelText, rightColX, barY + 5);

            const barX = rightColX + 60;
            // Brand chart background rail (use --brand-bg-light)
            doc.setFillColor(...COLORS.lightBg);
            doc.rect(barX, barY, chartBarWidth, barHeight, 'F');

            const filledWidth = Math.max(Math.round((pt.count / maxProjectValue) * chartBarWidth), 4);
            doc.setFillColor(...COLORS.chartBlue);
            doc.rect(barX, barY, filledWidth, barHeight, 'F');

            setFont(TYPE.tiny, false);
            doc.setTextColor(...COLORS.cardMuted);
            doc.text(String(pt.count), barX + chartBarWidth + 6, barY + 5);
        });

        rightY += topProjectTypes.length * barSpacing + 40;
        syncColumns();

        // ===== RIGHT: Organization types (green bars)
        setFont(TYPE.h2, true);
        doc.setTextColor(...COLORS.darkText);
        doc.text('Organization types', rightColX, rightY);
        rightY += TYPE.h2 * 1.6;

        const topOrgTypes = organizationTypes.slice(0, 5);
        const maxOrgValue = Math.max(...topOrgTypes.map(o => o.count), 1);

        topOrgTypes.forEach((ot, idx) => {
            const barY = rightY + idx * barSpacing;

            setFont(TYPE.tiny, false);
            doc.setTextColor(...COLORS.cardText);
            const labelText = ot.name.length > 18 ? ot.name.substring(0, 15) + '...' : ot.name;
            doc.text(labelText, rightColX, barY + 5);

            const barX = rightColX + 60;
            // Brand chart background rail (use --brand-bg-light)
            doc.setFillColor(...COLORS.lightBg);
            doc.rect(barX, barY, chartBarWidth, barHeight, 'F');

            const filled = Math.max(Math.round((ot.count / maxOrgValue) * chartBarWidth), 4);
            doc.setFillColor(...COLORS.chartGreen);
            doc.rect(barX, barY, filled, barHeight, 'F');

            setFont(TYPE.tiny, false);
            doc.setTextColor(...COLORS.cardMuted);
            doc.text(String(ot.count), barX + chartBarWidth + 6, barY + 5);
        });

        rightY += topOrgTypes.length * barSpacing + 8;
        syncColumns();

        // ===== FOOTER: concise briefing metadata
        const footerY = pageHeight - 28;
        setFont(TYPE.small, false);
        doc.setTextColor(...COLORS.mutedText);
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        doc.text(`Briefing date: ${currentDate}`, margin, footerY);

        const centerText = 'Prepared by Complex Risk Analytics Fund (CRAF\'d)';
        const centerWidth = doc.getTextWidth(centerText);
        doc.text(centerText, (pageWidth - centerWidth) / 2, footerY);

        const noteText = 'Full interactive dashboard available online';
        const noteWidth = doc.getTextWidth(noteText);
        doc.text(noteText, pageWidth - margin - noteWidth, footerY);

        // Save file
        const fileName = `Crisis-Data-Funding${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

    } catch (err) {
        console.error('Failed to generate PDF:', err);
        throw new Error('Failed to generate PDF. Please try again or check console for details.');
    }
}
