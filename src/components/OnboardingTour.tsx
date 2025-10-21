'use client';

import { useEffect, useState } from 'react';

type Step = {
    id: string;
    title: string;
    description: string;
    hint?: string;
};

const STORAGE_KEY = 'crafd:onboarding:seen_v1';

export default function OnboardingTour({ forceOpen }: { forceOpen?: boolean }) {
    const [open, setOpen] = useState<boolean>(false);
    const [stepIndex, setStepIndex] = useState<number>(0);
    const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

    const steps: Step[] = [
        {
            id: 'intro',
            title: 'Welcome to the Crisis Data Compass',
            description:
                "This quick tour highlights the main features of the dashboard so you can find data, filters and deep-dive modals quickly.",
            hint: 'Click Next to continue',
        },
        {
            id: 'search',
            title: 'Search & Filters',
            description:
                'Use the search box to find products or organizations. Use Donor and Type dropdowns to filter results. The Reset button clears all filters.',
            hint: 'Try pressing Enter in the search box to run a search',
        },
        {
            id: 'stats',
            title: 'Quick Stats',
            description:
                'At the top-left you can see three cards with donor countries, organizations and projects counts. They update as you change filters.',
            hint: 'Hover a stat card to see a tooltip with more details',
        },
        {
            id: 'list',
            title: 'Organizations & Projects',
            description:
                'The main list shows organizations and the projects they run. Click a project to open a product modal, or click the organization name to see curated organization details.',
            hint: 'Click an organization to open the organization modal',
        },
        {
            id: 'charts',
            title: 'Charts & Categories',
            description:
                'The right column contains interactive charts for organization types and project categories. Click bars to explore groups and see corresponding items in the list.',
            hint: 'Try expanding the chart area or click a bar to learn more',
        },
        {
            id: 'export',
            title: 'Export & Share',
            description:
                'Use the Share button to copy a link to the current view, or the Export button to create a one-pager PDF of the current selection.',
        },
        {
            id: 'end',
            title: 'You are ready!',
            description: 'That covers the essentials. You can re-open this tour from the help menu later.',
            hint: 'Close to get started — enjoy exploring!',
        },
    ];

    useEffect(() => {
        // only run on client
        try {
            const seen = localStorage.getItem(STORAGE_KEY);
            if (forceOpen) {
                setOpen(true);
                return;
            }
            if (!seen) {
                setOpen(true);
            }
        } catch (e) {
            // ignore localStorage errors
            setOpen(true);
        }
    }, [forceOpen]);

    const close = () => {
        if (dontShowAgain) {
            try {
                localStorage.setItem(STORAGE_KEY, '1');
            } catch (e) {
                // ignore
            }
        }
        setOpen(false);
    };

    if (!open) return null;

    const step = steps[stepIndex];

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={close} />
            <div className="relative max-w-3xl w-full mx-4">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-slate-200">
                    <div className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                                {step.hint && <p className="mt-3 text-xs text-slate-500">{step.hint}</p>}
                            </div>
                            <div className="ml-4 flex items-center gap-2">
                                <button
                                    aria-label="close tour"
                                    className="text-slate-400 hover:text-slate-600"
                                    onClick={close}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
                                    disabled={stepIndex === 0}
                                    className={`px-3 py-1 rounded-md border ${stepIndex === 0 ? 'opacity-40 cursor-not-allowed' : 'bg-slate-50 hover:bg-slate-100'}`}
                                >
                                    Prev
                                </button>

                                <div className="flex items-center gap-2">
                                    {steps.map((s, i) => (
                                        <button
                                            key={s.id}
                                            onClick={() => setStepIndex(i)}
                                            className={`w-2 h-2 rounded-full ${i === stepIndex ? 'bg-[var(--brand-primary)]' : 'bg-slate-200'}`}
                                            aria-label={`step-${i + 1}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={dontShowAgain}
                                        onChange={(e) => setDontShowAgain(e.target.checked)}
                                    />
                                    Don't show again
                                </label>

                                {stepIndex < steps.length - 1 ? (
                                    <button
                                        onClick={() => setStepIndex(Math.min(steps.length - 1, stepIndex + 1))}
                                        className="px-4 py-2 rounded-md bg-[var(--brand-primary)] text-white shadow-sm hover:opacity-95"
                                    >
                                        Next
                                    </button>
                                ) : (
                                    <button
                                        onClick={close}
                                        className="px-4 py-2 rounded-md bg-[var(--brand-primary)] text-white shadow-sm hover:opacity-95"
                                    >
                                        Done
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500">
                        Tip: you can re-open this tour from the help menu if you change your mind.
                    </div>
                </div>
            </div>
        </div>
    );
}
