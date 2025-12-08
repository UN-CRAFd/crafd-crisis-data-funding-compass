export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect?: string; error?: string }>
}) {
    const params = await searchParams
    const redirect = params?.redirect ?? '/'
    const hasError = params?.error === '1'
    
    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F1B434]/50 via-[#F1B434]/30 to-[#F1B434] p-4">
            <div className="w-full max-w-md">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#d9b206]/20 p-8">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="space-y-2">
                            <h1 className="text-lg sm:text-2xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                            <span className="qanelas-title">CRISIS DATA</span> <span className="font-roboto">Funding Compass</span>
                        </h1>
                           
                        </div>

                        {/* Error Message */}
                        {hasError && (
                            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                                <p className="font-medium">Incorrect password</p>
                                <p className="text-sm mt-1">
                                    Please try again or contact us for assistance.
                                </p>
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
                                    placeholder="Enter password"
                                    autoFocus
                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#e6af26] focus:border-transparent transition-all"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full px-4 py-3 bg-[#e6af26] text-white rounded-lg font-medium hover:bg-[#a78003] transition-colors"
                            >
                                Enter
                            </button>
                        </form>

                        {/* Footer */}
                        <div className="pt-6 border-t border-slate-200">
                            <p className="text-sm text-slate-500">
                                For password access, contact{' '}
                                <a 
                                    href="mailto:crafd@un.org?subject=Access%20Request%20%7C%20Crisis%20Data%20Funding%20Compass" 
                                    className="text-[#e6af26] hover:text-[#a78003] font-medium transition-colors"
                                >
                                    crafd@un.org
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
