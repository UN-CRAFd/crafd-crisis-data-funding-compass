import CrisisDataDashboardWrapper from "@/components/CrisisDataDashboardWrapper";
import { Suspense } from "react";
import { Compass } from "lucide-react";
import labels from "@/config/labels.json";

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Compass className="mr-3 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
          <span className="text-slate-600 dark:text-slate-400">
            {labels.loading.message}
          </span>
        </div>
      }
    >
      <CrisisDataDashboardWrapper />
    </Suspense>
  );
}
