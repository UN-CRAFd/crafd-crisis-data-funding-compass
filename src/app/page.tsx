import CrisisDataDashboardWrapper from "@/components/CrisisDataDashboardWrapper";
import { Suspense } from "react";
import { Compass } from "lucide-react";
// Update the import path to the correct relative location for labels.json
import labels from "../config/labels.json";

export default async function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Compass className="mr-3 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
          <span className="text-slate-600">{labels.loading.message}</span>
        </div>
      }
    >
      <CrisisDataDashboardWrapper />
    </Suspense>
  );
}
