import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Compass } from "lucide-react";
import HomePage from "@/components/HomePage";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const keys = Object.keys(params);

  // Legacy share-link support: /?d=germany&t=... → /explore?d=germany&t=...
  if (keys.length > 0) {
    const qs = new URLSearchParams(params).toString();
    redirect(`/explore?${qs}`);
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
          <Compass className="mr-3 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
