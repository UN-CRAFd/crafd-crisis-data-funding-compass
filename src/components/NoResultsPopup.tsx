'use client';

import { AlertCircle, RotateCcw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NoResultsPopupProps {
    onResetFilters?: () => void;
    message?: string;
}

export default function NoResultsPopup({ 
    onResetFilters, 
    message = 'No data matches your current filters. Try adjusting your criteria or reset all filters.'
}: NoResultsPopupProps) {
    return (
        <div className="flex items-center justify-center py-12 sm:py-16">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center p-6">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">
                        No Results Found
                    </h3>
                    <p className="text-sm text-slate-600 mb-4">
                        {message}
                    </p>
                    <div className="flex flex-col gap-2 w-full">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (onResetFilters) {
                                    onResetFilters();
                                }
                            }}
                            className="flex items-center justify-center gap-2 w-full"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Reset Filters
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => window.open('https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form', '_blank')}
                            className="flex items-center justify-center gap-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white w-full"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Send Feedback
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
