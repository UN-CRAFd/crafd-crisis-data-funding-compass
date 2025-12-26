"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import labels from "@/config/labels.json";
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
  BookCheck,
} from "lucide-react";

// ============================================================================
// REUSABLE COMPONENTS
// ============================================================================

/** Basic info card with title and description */
const InfoCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <h4 className="mb-2 font-semibold text-slate-800">{title}</h4>
    <p className="text-sm leading-relaxed text-slate-600">{children}</p>
  </div>
);

/** Info card with icon in title */
const IconInfoCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
      <Icon className="h-4 w-4" style={{ color: "var(--brand-primary)" }} />
      {title}
    </h4>
    <p className="text-sm leading-relaxed text-slate-600">{children}</p>
  </div>
);

/** Numbered step card */
const NumberedStep = ({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div className="mb-2 flex items-center gap-3">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        {step}
      </div>
      <h4 className="font-semibold text-slate-800">{title}</h4>
    </div>
    <p className="ml-11 text-sm leading-relaxed text-slate-600">{children}</p>
  </div>
);

/** Warning/limitation card with amber background */
const WarningCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
    <h4 className="mb-2 font-semibold text-slate-800">{title}</h4>
    <p className="text-sm leading-relaxed text-slate-600">{children}</p>
  </div>
);

/** Section header with icon */
const SectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-800">
    <Icon className="h-5 w-5" style={{ color: "var(--brand-primary)" }} />
    {children}
  </h3>
);

/** Screenshot display */
const Screenshot = ({ src, alt }: { src: string; alt: string }) => (
  <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-none bg-white p-8">
    <img
      src={src}
      alt={alt}
      className="max-h-[520px] max-w-full rounded-md object-contain"
      loading="lazy"
    />
  </div>
);

/** Bullet list item */
const BulletItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <span
      className="min-w-fit font-semibold"
      style={{ color: "var(--brand-primary)" }}
    >
      •
    </span>
    <span>
      <strong>{children}</strong>
    </span>
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
    const keywords = [
      "import",
      "from",
      "as",
      "def",
      "class",
      "if",
      "else",
      "for",
      "while",
      "return",
      "with",
      "open",
      "print",
    ];
    const builtins = [
      "pd",
      "zip_ref",
      "zipfile",
      "Path",
      "len",
      "read_csv",
      "extractall",
      "ZipFile",
      "contains",
      "groupby",
      "size",
      "str",
    ];

    let html = text
      // Escape HTML first
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Process line by line to handle comments properly
    html = html
      .split("\n")
      .map((line) => {
        // Find comment position
        const commentIndex = line.indexOf("#");
        let beforeComment = line;
        let comment = "";

        if (commentIndex !== -1) {
          // Check if # is inside a string
          const singleQuotePos = line.lastIndexOf("'", commentIndex);
          const doubleQuotePos = line.lastIndexOf('"', commentIndex);
          const singleQuoteEnd = line.indexOf("'", singleQuotePos + 1);
          const doubleQuoteEnd = line.indexOf('"', doubleQuotePos + 1);

          const inSingleQuote =
            singleQuotePos !== -1 &&
            (singleQuoteEnd === -1 || singleQuoteEnd > commentIndex);
          const inDoubleQuote =
            doubleQuotePos !== -1 &&
            (doubleQuoteEnd === -1 || doubleQuoteEnd > commentIndex);

          if (!inSingleQuote && !inDoubleQuote) {
            beforeComment = line.substring(0, commentIndex);
            comment = line.substring(commentIndex);
          }
        }

        // Highlight strings (amber) in the non-comment part
        beforeComment = beforeComment.replace(
          /(['"])(?:(?=(\\?))\2.)*?\1/g,
          '<span style="color: #dab776;">$&</span>',
        );

        // Highlight numbers (cyan) in the non-comment part
        beforeComment = beforeComment.replace(
          /\b\d+\b/g,
          '<span style="color: #7dd3fc;">$&</span>',
        );

        // Highlight keywords (purple) in the non-comment part
        beforeComment = beforeComment.replace(
          new RegExp(`\\b(${keywords.join("|")})\\b`, "g"),
          '<span style="color: #c084fc;">$1</span>',
        );

        // Highlight builtins (blue) in the non-comment part
        beforeComment = beforeComment.replace(
          new RegExp(`\\b(${builtins.join("|")})\\b`, "g"),
          '<span style="color: #60a5fa;">$1</span>',
        );

        // Highlight comment (green) - only if there is one
        if (comment) {
          comment = `<span style="color: #10b981;">${comment}</span>`;
        }

        return beforeComment + comment;
      })
      .join("\n");

    return html;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Python
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-slate-800 p-1.5 transition-colors hover:bg-slate-700"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">
                Copied
              </span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs text-slate-400">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-slate-100"
        style={{ fontFamily: "'Courier New', monospace" }}
      >
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

const INVESTMENT_TYPE_COLORS: Record<
  string,
  { bg: string; border: string; text: string; step: string }
> = {
  "Data Sets & Commons": {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-900",
    step: "bg-blue-600",
  },
  "Infrastructure & Platforms": {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-900",
    step: "bg-red-600",
  },
  "Crisis Analytics & Insights": {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-900",
    step: "bg-orange-400",
  },
  "Human Capital & Know-how": {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-900",
    step: "bg-green-600",
  },
  "Standards & Coordination": {
    bg: "bg-purple-50",
    border: "border-purple-300",
    text: "text-purple-900",
    step: "bg-purple-600",
  },
  "Learning & Exchange": {
    bg: "bg-indigo-50",
    border: "border-indigo-300",
    text: "text-indigo-900",
    step: "bg-indigo-600",
  },
};

const INVESTMENT_TYPE_DATA: Record<
  string,
  { icon: LucideIcon; description: string; themes: string[] }
> = {
  "Data Sets & Commons": {
    icon: Database,
    description:
      "Open and shared data resources that provide foundational information for crisis response and humanitarian action.",
    themes: [
      "Humanitarian Access Data",
      "Displacement & Migration Data",
      "Baseline Population Data",
      "Geospatial Data",
      "Household Survey Data",
      "Health Data",
      "Food Security Data",
      "Nutrition Data",
      "Climate Data",
      "Conflict & Violence Data",
      "Gender Data",
      "Education Data",
      "WASH Data",
      "Poverty Data",
      "Environmental Data",
      "3W Data",
      "Administrative Boundaries",
    ],
  },
  "Infrastructure & Platforms": {
    icon: Server,
    description:
      "Technical systems and platforms that enable data collection, storage, processing, and distribution at scale.",
    themes: [
      "Geographic Information Systems (GIS)",
      "Data Governance & Management",
      "Data Collection",
      "AI & ML Infrastructure",
      "Data Processing & Transformation",
      "Data Storage",
      "Access & Sharing",
      "Data Quality & Validation",
      "Data Documentation & Metadata",
      "Open Source LLMs",
    ],
  },
  "Crisis Analytics & Insights": {
    icon: BarChart3,
    description:
      "Analytical products, models, and visualizations that transform raw data into actionable intelligence.",
    themes: [
      "Needs Assessment Analytics",
      "Climate Analytics",
      "Health Analytics",
      "Monitoring & Alerts",
      "Disaster Hazard & Risk Modelling",
      "Food Security Analytics",
      "Displacement Analytics",
      "Conflict Analytics",
      "Population Analytics",
      "Geospatial Analytics",
      "AI Models",
      "Anticipatory & Early Action Forecasts",
      "Gender Analytics",
      "Poverty Analytics",
      "Damage Assessments",
    ],
  },
  "Human Capital & Know-how": {
    icon: Users,
    description:
      "Investments in people, skills, and organizational capacity to effectively use and produce crisis data.",
    themes: [
      "Capacity Building",
      "Upskilling & Training",
      "Data Analytics",
      "Information Management",
      "Surge Capacity",
      "Regional Hubs",
      "Data Collection & Generation",
      "Data Management & Visualization",
      "Applied Data Analytics & Insights Generation",
      "Digital Product & Tool Development",
    ],
  },
  "Standards & Coordination": {
    icon: Settings,
    description:
      "Frameworks, protocols, and coordination mechanisms that enable interoperability and collective action.",
    themes: [
      "Common Indicators",
      "Methodological Standards",
      "Metadata",
      "Open Access",
      "Ethics",
      "Interoperable Formats",
      "Data Documentation",
      "APIs Standard",
      "Open Source",
      "Data Protection & Privacy Frameworks",
      "Standard Geocodes",
      "Peer Review",
    ],
  },
  "Learning & Exchange": {
    icon: BookOpen,
    description:
      "Knowledge sharing, documentation, and community building that advances the field of crisis data.",
    themes: [
      "Workshops",
      "Webinars",
      "Best Practices",
      "Conferences",
      "Guides",
      "Case Studies",
      "Communities of Practice",
      "Forums",
      "Peer Learning",
      "Talk Series",
    ],
  },
};

const INVESTMENT_TYPES = Object.keys(INVESTMENT_TYPE_DATA);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MethodologyPage({
  logoutButton,
}: MethodologyPageProps) {
  const [shareSuccess, setShareSuccess] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(
    "Data Sets & Commons",
  );

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
      <PageHeader onShare={handleShare} shareSuccess={shareSuccess} />

      {/* Main Content */}
      <div className="mx-auto max-w-[82rem] px-4 py-0 pt-20 sm:px-6 sm:py-0 sm:pt-24 lg:px-8">
        <Tabs defaultValue="collection" className="w-full">
          <div className="space-y-4 sm:space-y-4">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl border-none bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] p-6 sm:p-8">
              <div className="relative z-10">
                <div className="mb-4 flex items-center gap-3">
                  <BookOpen
                    className="h-8 w-8"
                    style={{ color: "var(--brand-primary)" }}
                  />
                  <h1
                    className="font-qanelas-subtitle text-3xl font-bold sm:text-4xl"
                    style={{ color: "black" }}
                  >
                    Methodology
                  </h1>
                </div>
                <p className="mb-6 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                  Understand how our data was collected and how to use it best
                  for your research
                </p>
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-white/60 p-2 lg:grid-cols-6">
                  {[
                    { value: "collection", icon: Search, label: "Collection" },
                    {
                      value: "classification",
                      icon: FileText,
                      label: "Classification",
                    },
                    {
                      value: "limitations",
                      icon: AlertTriangle,
                      label: "Limitations",
                    },
                    { value: "filtering", icon: Layers, label: "Filtering" },
                    { value: "network", icon: TrendingUp, label: "Network" },
                    { value: "export", icon: Download, label: "Export" },
                  ].map(({ value, icon: Icon, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm sm:text-sm"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>

            {/* Overview Cards */}

            {/* Main Methodology Content */}
            <Card className="!border-0 bg-white">
              <CardContent className="px-4 pt-0 pb-0 sm:px-6 sm:pb-0">
                {/* Data Collection Tab */}
                <TabsContent
                  value="collection"
                  className="animate-tab-enter mt-0 mb-0"
                >
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <SectionTitle icon={Search}>Data Collection</SectionTitle>
                      <div className="space-y-4">
                        <IconInfoCard
                          icon={BookCheck}
                          title="Source Identification"
                        >
                          We aggregate data from a curated set of public and
                          partner sources, including international
                          organizations, government portals, and open data
                          repositories relevant to crisis funding and
                          humanitarian response.
                        </IconInfoCard>
                        <IconInfoCard
                          icon={Workflow}
                          title="Automated & Manual Gathering"
                        >
                          Data is collected through a combination of automated
                          pipelines (APIs, web scraping) and manual curation to
                          ensure completeness and accuracy.
                        </IconInfoCard>
                        <IconInfoCard
                          icon={CalendarSync}
                          title="Regular Updates"
                        >
                          The dataset is refreshed periodically to capture new
                          funding flows, projects, and organizational changes.
                        </IconInfoCard>
                      </div>
                    </div>
                    <Screenshot
                      src="/screenshots/collection.png"
                      alt="Data Collection Process"
                    />
                  </div>
                </TabsContent>

                {/* Classification Tab */}
                <TabsContent
                  value="classification"
                  className="animate-tab-enter mt-0"
                >
                  <div className="space-y-6">
                    <div>
                      <SectionTitle icon={FileText}>
                        Data Classification
                      </SectionTitle>
                      <div className="space-y-4">
                        <InfoCard title="Entity Mapping">
                          Organizations, donors, and projects are mapped to
                          unique identifiers to avoid duplication and enable
                          cross-referencing.
                        </InfoCard>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <h4 className="mb-2 font-semibold text-slate-800">
                            Investment Typing
                          </h4>
                          <p className="mb-3 text-sm leading-relaxed text-slate-600">
                            Each project is classified into one or more
                            investment types based on project descriptions and
                            metadata:
                          </p>
                          <ul className="space-y-2 text-sm text-slate-600">
                            {INVESTMENT_TYPES.map((type) => (
                              <BulletItem key={type}>{type}</BulletItem>
                            ))}
                          </ul>
                        </div>
                        <InfoCard title="Theme Tagging">
                          Projects are tagged with thematic areas (e.g., health,
                          displacement, food security) using keyword analysis
                          and expert review.
                        </InfoCard>
                      </div>
                    </div>

                    {/* Interactive Classification Explorer */}
                    <div className="overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-slate-50 p-4">
                        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Layers
                            className="h-4 w-4"
                            style={{ color: "var(--brand-primary)" }}
                          />
                          Asset Type Explorer
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Click on an investment type to explore
                        </p>
                      </div>

                      {/* Type Selector Buttons */}
                      <div className="border-b border-slate-100 bg-slate-50/50 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          {INVESTMENT_TYPES.map((type) => {
                            const TypeIcon = INVESTMENT_TYPE_DATA[type].icon;
                            const isSelected = selectedType === type;
                            return (
                              <button
                                key={type}
                                onClick={() => setSelectedType(type)}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${
                                  isSelected
                                    ? "border-2 shadow-sm"
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor:
                                          "var(--badge-other-bg)",
                                        color: "var(--badge-other-text)",
                                        borderColor:
                                          "var(--badge-other-border)",
                                      }
                                    : {}
                                }
                              >
                                <TypeIcon
                                  className={`h-4 w-4 shrink-0 ${isSelected ? "" : "text-slate-400"}`}
                                />
                                <span className="truncate">{type}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected Type Details */}
                      {selectedType &&
                        INVESTMENT_TYPE_DATA[selectedType] &&
                        (() => {
                          const {
                            icon: TypeIcon,
                            description,
                            themes,
                          } = INVESTMENT_TYPE_DATA[selectedType];
                          return (
                            <div className="space-y-4 p-4">
                              <div
                                className="flex items-center gap-3 rounded-lg p-3"
                                style={{
                                  backgroundColor: "var(--badge-other-bg)",
                                  border: "1px solid var(--badge-other-border)",
                                }}
                              >
                                <div
                                  className="rounded-lg p-2"
                                  style={{
                                    backgroundColor: "var(--badge-other-text)",
                                  }}
                                >
                                  <TypeIcon className="h-5 w-5 text-white" />
                                </div>
                                <h5
                                  className="font-bold"
                                  style={{ color: "var(--badge-other-text)" }}
                                >
                                  {selectedType}
                                </h5>
                              </div>
                              <p className="text-sm leading-relaxed text-slate-600">
                                {description}
                              </p>
                              <div>
                                <h6 className="mb-2 text-xs font-semibold tracking-wide text-slate-700 uppercase">
                                  Related Themes
                                </h6>
                                <div className="flex flex-wrap gap-1.5">
                                  {themes.map((theme, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center rounded px-2 py-1 text-xs"
                                      style={{
                                        backgroundColor:
                                          "var(--badge-other-bg)",
                                        color: "var(--badge-other-text)",
                                        border:
                                          "1px solid var(--badge-other-border)",
                                      }}
                                    >
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
                <TabsContent
                  value="limitations"
                  className="animate-tab-enter mt-0"
                >
                  <div className="space-y-6">
                    <div>
                      <SectionTitle icon={AlertTriangle}>
                        Limitations
                      </SectionTitle>
                      <div className="space-y-4">
                        <InfoCard title="Data Gaps">
                          Not all funding flows or projects are publicly
                          reported; some data may be incomplete or delayed.
                        </InfoCard>
                        <InfoCard title="Classification Subjectivity">
                          Investment type and theme assignments may involve
                          interpretation, especially for multi-sector projects.
                        </InfoCard>
                        <InfoCard title="Simplification">
                          For clarity, some visualizations (e.g., UN donor
                          lists) are simplified and do not reflect the full
                          complexity of funding relationships.
                        </InfoCard>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Filtering & Query Tab */}
                <TabsContent
                  value="filtering"
                  className="animate-tab-enter mt-0"
                >
                  <div className="space-y-6">
                    <div>
                      <SectionTitle icon={Layers}>
                        Filtering & Query
                      </SectionTitle>
                      <div className="space-y-4">
                        <InfoCard title="Search Logic">
                          Search operates on project titles and organization
                          names.
                        </InfoCard>
                        <InfoCard title="Donor Filter">
                          Multiple donors trigger a conjunction. Returned
                          projects must be co-financed by every selected donor.
                        </InfoCard>
                        <InfoCard title="Type Filter">
                          Multiple types trigger a disjunction. Organizations
                          appear if any of their projects match at least one
                          selected type.
                        </InfoCard>
                        <InfoCard title="Theme Filter">
                          Multiple themes trigger a disjunction. Projects appear
                          if they match at least one of the selected themes.
                        </InfoCard>
                        <InfoCard title="Type–Theme Relationship">
                          Themes are nested under types. Selecting a type
                          restricts theme options to those linked to that type.
                          Themes from other types can still surface when
                          projects span multiple types and carry overlapping
                          themes.
                        </InfoCard>
                      </div>
                    </div>

                    {/* Interactive Filter Logic Flow */}
                    <SectionTitle icon={Search}>Filtering Process</SectionTitle>

                    <div className="rounded-lg border-2 border-none bg-white p-6 shadow-sm">
                      {/* Flow Diagram */}
                      <div className="space-y-3 text-xs">
                        {/* Step 1: Donor Check */}
                        <div className="rounded-lg border-2 border-slate-300 bg-slate-100 p-3">
                          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
                              1
                            </span>
                            Donor Filter (Gatekeeper)
                          </div>
                          <div className="space-y-1 pl-7 text-slate-700">
                            <div>
                              🔍 Check: Does org have <strong>ALL</strong>{" "}
                              selected donors?
                            </div>
                            <div className="rounded border-2 border-slate-200 bg-white px-2 py-1 font-mono text-[10px]">
                              donors.every(d → org.donors.includes(d))
                            </div>
                            <div className="mt-2 flex gap-2">
                              <div className="flex-1 rounded border-2 border-slate-300 bg-slate-50 px-2 py-1 text-slate-700">
                                ✓ YES → Continue to Step 2
                              </div>
                              <div className="flex-1 rounded border-2 border-slate-400 bg-slate-200 px-2 py-1 text-slate-800">
                                ✗ NO → Hide org entirely
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="h-4 w-0.5 bg-slate-300"></div>
                        </div>

                        {/* Step 2: Search Check */}
                        <div className="rounded-lg border-2 border-slate-300 bg-slate-100 p-3">
                          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
                              2
                            </span>
                            Search Filter Check
                          </div>
                          <div className="space-y-1 pl-7 text-slate-700">
                            <div>🔍 Check: Does org name match search?</div>
                            <div className="rounded border-2 border-slate-200 bg-white px-2 py-1 font-mono text-[10px]">
                              org.name.includes(searchQuery)
                            </div>
                            <div className="mt-2 space-y-2">
                              <div className="rounded border-2 border-slate-300 bg-slate-50 px-2 py-1.5 text-slate-700">
                                <div className="mb-1 font-semibold">
                                  ✓ YES → Show ALL org projects
                                </div>
                                <div className="pl-4 text-[10px]">
                                  Then filter by Type/Theme if selected
                                </div>
                              </div>
                              <div className="rounded border-2 border-slate-400 bg-slate-200 px-2 py-1.5 text-slate-800">
                                <div className="mb-1 font-semibold">
                                  ✗ NO → Check each project
                                </div>
                                <div className="pl-4 text-[10px]">
                                  Go to Step 3 for project-level filtering
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="h-4 w-0.5 bg-slate-300"></div>
                        </div>

                        {/* Step 3: Project-Level Filters */}
                        <div className="rounded-lg border-2 border-slate-300 bg-slate-100 p-3">
                          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
                              3
                            </span>
                            Project-Level Filters
                          </div>
                          <div className="space-y-2 pl-7 text-slate-700">
                            <div className="rounded border-2 border-slate-200 bg-white px-3 py-2">
                              <div className="mb-1 font-semibold">
                                A. Search (if org didn't match)
                              </div>
                              <div className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px]">
                                project.name.includes(searchQuery)
                              </div>
                              <div className="mt-1 text-[10px]">
                                Must match for project to be visible
                              </div>
                            </div>

                            <div className="rounded border-2 border-slate-200 bg-white px-3 py-2">
                              <div className="mb-1 flex items-center gap-1 font-semibold">
                                B. Type Filter{" "}
                                <span
                                  style={{ color: "var(--brand-primary-dark)" }}
                                  className="font-bold"
                                >
                                  (OR logic)
                                </span>
                              </div>
                              <div className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px]">
                                project.types.some(t →
                                selectedTypes.includes(t))
                              </div>
                              <div className="mt-1 text-[10px]">
                                Project needs ≥1 matching type
                              </div>
                            </div>

                            <div className="rounded border-2 border-slate-200 bg-white px-3 py-2">
                              <div className="mb-1 flex items-center gap-1 font-semibold">
                                C. Theme Filter{" "}
                                <span
                                  style={{ color: "var(--brand-primary-dark)" }}
                                  className="font-bold"
                                >
                                  (OR logic)
                                </span>
                              </div>
                              <div className="rounded bg-slate-50 px-2 py-1 font-mono text-[10px]">
                                project.themes.some(th →
                                selectedThemes.includes(th))
                              </div>
                              <div className="mt-1 text-[10px]">
                                Project needs ≥1 matching theme
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="h-4 w-0.5 bg-slate-300"></div>
                        </div>

                        {/* Step 4: Final Decision */}
                        <div className="rounded-lg border-2 border-slate-300 bg-slate-100 p-3">
                          <div className="mb-2 flex items-center gap-2 font-bold text-slate-800">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-xs text-white">
                              4
                            </span>
                            Final Decision
                          </div>
                          <div className="space-y-2 pl-7 text-slate-700">
                            <div className="rounded border-2 border-slate-300 bg-slate-50 px-2 py-1.5">
                              <div className="font-semibold text-slate-800">
                                Show Organization IF:
                              </div>
                              <ul className="mt-1 space-y-0.5 text-[10px] text-slate-700">
                                <li>• Passes donor check (Step 1)</li>
                                <li>
                                  • AND has ≥1 visible project after filtering
                                </li>
                                <li>
                                  • OR org name matches search (shows all
                                  projects)
                                </li>
                              </ul>
                            </div>
                            <div className="rounded border-2 border-slate-400 bg-slate-200 px-2 py-1.5">
                              <div className="font-semibold text-slate-800">
                                Hide Organization IF:
                              </div>
                              <ul className="mt-1 space-y-0.5 text-[10px] text-slate-700">
                                <li>• Fails donor check</li>
                                <li>
                                  • OR has 0 visible projects after filtering
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Key Insights */}
                        <div
                          className="mt-4 rounded-lg border-2 p-3"
                          style={{
                            backgroundColor: "var(--brand-bg-light)",
                            borderColor: "var(--brand-border)",
                          }}
                        >
                          <div
                            className="mb-2 text-xs font-bold"
                            style={{ color: "var(--brand-primary-dark)" }}
                          >
                            🔑 Key Insights:
                          </div>
                          <ul
                            className="space-y-1 text-[10px]"
                            style={{ color: "var(--brand-primary-dark)" }}
                          >
                            <li className="flex gap-2">
                              <span className="font-bold">1.</span>
                              <span>
                                <strong>Donor filter</strong> is a gatekeeper —
                                fails = entire org hidden
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">2.</span>
                              <span>
                                <strong>Search on org name</strong> shows ALL
                                org projects (bypasses project search)
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">3.</span>
                              <span>
                                <strong>Type uses OR</strong> (any match) →{" "}
                                <strong>Theme uses OR</strong> (any match)
                              </span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">4.</span>
                              <span>
                                Filters cascade: Donor → Search → Type → Theme
                              </span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Network Analysis Tab */}
                <TabsContent value="network" className="animate-tab-enter mt-0">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div>
                      <SectionTitle icon={TrendingUp}>
                        Network Analysis
                      </SectionTitle>
                      <div className="space-y-4">
                        <InfoCard title="Graph Structure">
                          The network view displays the filtered dataset as an
                          undirected graph, showing relationships between
                          donors, organizations, and projects.
                        </InfoCard>
                        <InfoCard title="Clustering Options">
                          Clustering options aggregate projects and
                          organizations by type, making it easier to identify
                          patterns and connections within specific investment
                          categories.
                        </InfoCard>
                        <InfoCard title="Interactive Nodes">
                          Project and organization nodes are interactive and
                          open a detail modal when clicked, providing in-depth
                          information about entities and their relationships.
                        </InfoCard>
                        <InfoCard title="Spatial Interpretation">
                          Spatial proximity in the graph has no geographic or
                          ideological meaning. Nimportode positions are
                          determined by the force-directed layout algorithm to
                          optimize visualization clarity.
                        </InfoCard>
                      </div>
                    </div>
                    <Screenshot
                      src="/screenshots/network.png"
                      alt="Network Graph Visualization"
                    />
                  </div>
                </TabsContent>

                {/* Export Tab */}
                <TabsContent value="export" className="animate-tab-enter mt-0">
                  <div className="space-y-8">
                    <div>
                      <SectionTitle icon={Download}>
                        Export Functionality
                      </SectionTitle>
                      <div className="space-y-4">
                        <InfoCard title="CSV Export">
                          Exports two CSV files (organization table and asset
                          table) in a ZIP archive. Organizations CSV includes
                          names, types, descriptions, and funding sources.
                          Assets CSV includes names, associated organizations,
                          types, themes, donors, descriptions, and website.
                        </InfoCard>
                        <InfoCard title="Excel Export">
                          Export the same data as a professionally formatted
                          Excel workbook. Includes organizations and assets
                          sheets with styling and optimized column widths.
                          Includes a README file with export metadata and
                          current filter details.
                        </InfoCard>
                        <InfoCard title="Sharing & Reproducibility">
                          All exports respect your current filters (donors,
                          investment types, themes, search query). The metadata
                          and README file includes information about which
                          filters were applied. Also, when sharing a link to the
                          app, the same filters will be pre-applied for
                          recipients, as the filter criteria are denoted in the
                          URL.
                        </InfoCard>
                      </div>
                    </div>
                    <div>
                      <SectionTitle icon={FileText}>
                        Working with the Data
                      </SectionTitle>
                      <div className="space-y-4">
                        <div>
                          <CodeBlock
                            code={`import pandas as pd
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
print(f"\\nAssets by type:\\n{by_type}")`}
                          />
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
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex items-center gap-3">
                    <MessageCircle
                      className="h-6 w-6"
                      style={{ color: "var(--brand-primary)" }}
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Questions or Feedback?
                      </h3>
                      <p className="text-sm text-slate-600">
                        We welcome your input to improve our methodology and
                        data quality.
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://forms.gle/GEbp7ccRZm1XQLX18"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium whitespace-nowrap text-white transition-all hover:shadow-lg"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Provide Feedback
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white sm:mt-16">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between sm:gap-0">
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-600 sm:text-sm">
                {labels.footer.dataGatheredBy}{" "}
                <a
                  href="https://crafd.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {labels.footer.organization}
                </a>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {labels.footer.copyright.replace(
                  "{year}",
                  new Date().getFullYear().toString(),
                )}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
