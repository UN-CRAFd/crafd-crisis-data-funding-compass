import CrisisDataDashboardWrapper from "@/components/CrisisDataDashboardWrapper";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-slate-600"></div>
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <CrisisDataDashboardWrapper />
    </Suspense>
  );
}
