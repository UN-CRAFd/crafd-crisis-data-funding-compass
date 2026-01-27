import labels from "@/config/labels.json";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const params = await searchParams;
  const redirect = params?.redirect ?? "/";
  const hasError = params?.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F1B434]/50 via-[#F1B434]/30 to-[#F1B434] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-[#d9b206]/20 bg-white/90 p-8 backdrop-blur-sm">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="truncate bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-lg text-transparent sm:text-2xl">
                <span className="qanelas-title">{labels.header.title}</span>{" "}
                <span className="font-roboto">{labels.header.subtitle}</span>
              </h1>
            </div>

            {/* Error Message */}
            {hasError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <p className="font-medium">{labels.login.errorTitle}</p>
                <p className="mt-1 text-sm">{labels.login.errorMessage}</p>
              </div>
            )}

            {/* Form */}
            <form method="POST" action="/auth" className="space-y-5">
              <input type="hidden" name="redirect" value={redirect} />

              <div className="space-y-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={labels.login.passwordPlaceholder}
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:ring-2 focus:ring-[#e6af26] focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#e6af26] px-4 py-3 font-medium text-white transition-colors hover:bg-[#a78003]"
              >
                {labels.login.submitButton}
              </button>
            </form>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500">
                For password access, contact{" "}
                <a
                  href="mailto:crafd@un.org?subject=Access%20Request%20%7C%20Crisis%20Data%20Funding%20Compass"
                  className="font-medium text-[#e6af26] transition-colors hover:text-[#a78003]"
                >
                  crafd@un.org
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
