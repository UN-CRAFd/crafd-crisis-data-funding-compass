import { Suspense } from "react";
import { Compass } from "lucide-react";
import OrganizationsPage from "@/components/OrganizationsPage";

export default function Organizations() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Compass className="mr-3 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
        </div>
      }
    >
      <OrganizationsPage />
    </Suspense>
  );
}
