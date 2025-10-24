'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SurveyBannerProps {
    surveyUrl?: string;
}

const SurveyBanner: React.FC<SurveyBannerProps> = ({ 
    surveyUrl = process.env.NEXT_PUBLIC_SURVEY_URL || '#' 
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
                transition-[opacity,max-height,transform] duration-300 ease-in-out overflow-hidden transform
                ${isVisible ? 'opacity-100 max-h-32 mb-4 translate-y-0' : 'opacity-0 max-h-0 mb-0 -translate-y-4'}
            `}
        >
            <div className="bg-gradient-to-r from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] rounded-lg p-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Megaphone className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm sm:text-base font-normal font-roboto text-slate-900">
                                Take our Ecosystem Survey Here!
                            </p>
                            
                        </div>
                        <Button
                            onClick={() => window.open(surveyUrl, '_blank')}
                            className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white font-medium px-4 py-2 text-sm sm:text-base whitespace-nowrap"
                        >
                            <span className="hidden sm:inline">Take Survey</span>
                            <span className="sm:hidden">Survey</span>
                            <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-500 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100"
                        aria-label="Close survey banner"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SurveyBanner;
