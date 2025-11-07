'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SurveyBannerProps {
    surveyUrl?: string;
}

const SurveyBanner: React.FC<SurveyBannerProps> = ({ 
    // Default to the requested Airtable form URL unless overridden by env
    surveyUrl = process.env.NEXT_PUBLIC_SURVEY_URL || 'https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // Show banner after 10 seconds
        const showTimer = setTimeout(() => {
            setShouldRender(true);
            // Small delay to trigger CSS transition
            setTimeout(() => setIsVisible(true), 50);
        }, 10000);

        // Auto-hide banner after 30 seconds (10s delay + 20s visible)
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
            // Remove from DOM after animation completes
            setTimeout(() => setShouldRender(false), 300);
        }, 30000);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(hideTimer);
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Remove from DOM after animation completes
        setTimeout(() => setShouldRender(false), 300);
    };

    if (!shouldRender) return null;

    return (
        <div
            className={`
                transition-[opacity,max-height,transform] duration-500 ease-out overflow-hidden transform
                ${isVisible ? 'opacity-100 max-h-40 mb-6 translate-y-0' : 'opacity-0 max-h-0 mb-0 -translate-y-4'}
            `}
        >
            <div className="relative rounded-lg p-[1px] shadow-sm transition-all duration-150" style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
                <div className="relative bg-white rounded-lg overflow-hidden border-var(--brand-primary-light)">
                    <div className="relative flex items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Simple icon container */}
                            <div className="flex-shrink-0">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-primary)' }}>
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-bold font-roboto mb-1" style={{ color: 'var(--brand-primary-dark)' }}>
                                    Share Your Insights!
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                    Help shape the crisis data ecosystem
                                </p>
                            </div>

                            {/* CTA Button - flat */}
                            <Button
                                onClick={() => window.open(surveyUrl, '_blank')}
                                className="text-white font-normal px-4 py-2 text-sm sm:text-base whitespace-nowrap rounded-md transition-colors flex items-center gap-2 hover:bg-var(--brand-primary-dark)"
                                style={{ backgroundColor: 'var(--brand-primary)' }}
                            >
                                <span className="hidden sm:inline">Take Survey</span>
                                <span className="sm:hidden">Survey</span>
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="flex-shrink-0 text-slate-500 hover:text-slate-700 transition-colors duration-150 p-2 rounded-md"
                            aria-label="Close survey banner"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SurveyBanner;
