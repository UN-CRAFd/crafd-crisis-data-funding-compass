"use client";

import { Roboto } from "next/font/google";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Compass, Menu } from "lucide-react";
import labels from "@/config/labels.json";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Loaded only for the header wordmark — weights 300 (light) and 700 (bold).
const headerFont = Roboto({
  subsets: ["latin"],
  weight: ["300", "700"],
  display: "swap",
});

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Repository", href: "/#repository" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/methodology" },
];

export default function PageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCompassRotating, setIsCompassRotating] = useState(false);
  const [repositoryVisible, setRepositoryVisible] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setRepositoryVisible(false);
      return;
    }
    const el = document.getElementById("repository");
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRepositoryVisible(entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pathname]);

  const handleCompassClick = () => {
    setIsCompassRotating(true);
    setTimeout(() => setIsCompassRotating(false), 1000);
  };

  const handleNavClick = (href: string) => {
    if (href === "/#repository") {
      if (pathname === "/") {
        document
          .getElementById("repository")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        router.push("/#repository");
      }
    } else {
      router.push(href);
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" && !repositoryVisible;
    if (href === "/#repository") return pathname === "/" && repositoryVisible;
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-[82rem] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          {/* Wordmark */}
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={handleCompassClick}
              className="block shrink-0 transition-transform duration-500 focus:outline-none"
              aria-label="Go to home"
            >
              <Compass
                className={`h-7 w-7 text-[var(--brand-primary)] ${
                  isCompassRotating ? "animate-compass-spin" : ""
                }`}
              />
            </button>
            <Link href="/" className="min-w-0">
              <h1
                className={`${headerFont.className} flex min-w-0 flex-col items-start gap-0 text-base text-black dark:text-white sm:text-xl lg:flex-row lg:items-center lg:gap-2 lg:text-3xl`}
              >
                <span className="whitespace-nowrap font-bold">
                  {labels.header.title}
                </span>
                <span className="whitespace-nowrap font-light">
                  {labels.header.subtitle}
                </span>
              </h1>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 sm:flex">
            {NAV_ITEMS.map(({ href, label }) => (
              <button
                key={href}
                onClick={() => handleNavClick(href)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive(href)
                    ? "font-semibold text-[var(--brand-primary)]"
                    : "text-slate-600 hover:text-[var(--brand-primary)] dark:text-slate-300 dark:hover:text-[var(--brand-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-md px-3 py-4 text-slate-700 dark:text-slate-300"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="w-auto min-w-[160px] border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
              >
                {NAV_ITEMS.map(({ href, label }) => (
                  <DropdownMenuItem
                    key={href}
                    onClick={() => handleNavClick(href)}
                    className={`cursor-pointer px-3 py-2 text-sm ${
                      isActive(href)
                        ? "font-semibold text-[var(--brand-primary)]"
                        : ""
                    }`}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
