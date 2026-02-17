import MethodologyPage from "@/components/MethodologyPage";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function Methodology() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <MethodologyPage />
    </Suspense>
  );
}
