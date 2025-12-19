export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
                <p className="text-slate-600 mb-8">Page not found</p>
                <a href="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Go Home
                </a>
            </div>
        </div>
    );
}
