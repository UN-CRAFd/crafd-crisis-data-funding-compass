import labels from "@/config/labels.json";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-slate-900">
          {labels.notFound.title}
        </h1>
        <p className="mb-8 text-slate-600">{labels.notFound.subtitle}</p>
        <a
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          {labels.notFound.button}
        </a>
      </div>
    </div>
  );
}
