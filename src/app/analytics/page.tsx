import AnalyticsPage from "@/components/AnalyticsPage";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Analytics() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <AnalyticsPage />
    </Suspense>
  );
}
