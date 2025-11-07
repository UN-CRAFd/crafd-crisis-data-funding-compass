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
            <div className="relative rounded-2xl p-[2px] shadow-2xl transition-all duration-300" style={{ 
                background: 'linear-gradient(135deg, var(--brand-primary-dark), var(--brand-primary), var(--brand-primary-light))',
                boxShadow: '0 25px 50px -12px rgba(230, 175, 38, 0.15)'
            }}>
                {/* Gradient border effect */}
                <div className="relative bg-white rounded-[14px] overflow-hidden">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 opacity-[0.03]">
                        <div className="absolute top-0 -left-4 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob" style={{ backgroundColor: 'var(--brand-primary-dark)' }}></div>
                        <div className="absolute top-0 -right-4 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ backgroundColor: 'var(--brand-primary)' }}></div>
                        <div className="absolute -bottom-8 left-20 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" style={{ backgroundColor: 'var(--brand-primary-light)' }}></div>
                    </div>
                    
                    <div className="relative flex items-center justify-between gap-4 p-5">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {/* Animated icon container */}
                            <div className="flex-shrink-0 relative">
                                <div className="absolute inset-0 rounded-xl blur-lg opacity-50 animate-pulse" style={{ 
                                    background: 'linear-gradient(135deg, var(--brand-primary-dark), var(--brand-primary))'
                                }}></div>
                                <div className="relative p-3 rounded-xl shadow-lg" style={{ 
                                    background: 'linear-gradient(135deg, var(--brand-primary-dark), var(--brand-primary))'
                                }}>
                                    <Megaphone className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-lg font-bold font-roboto mb-1" style={{
                                    background: 'linear-gradient(90deg, var(--brand-primary-dark), var(--brand-primary))',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}>
                                    Share Your Insights!
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                                    Help shape the crisis data ecosystem
                                </p>
                            </div>
                            
                            {/* CTA Button */}
                            <Button
                                onClick={() => window.open(surveyUrl, '_blank')}
                                className="text-white font-semibold px-5 py-2.5 text-sm sm:text-base whitespace-nowrap rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-2"
                                style={{
                                    background: 'linear-gradient(90deg, var(--brand-primary-dark), var(--brand-primary))',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, var(--brand-border), var(--brand-primary-dark))';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'linear-gradient(90deg, var(--brand-primary-dark), var(--brand-primary))';
                                }}
                            >
                                <span className="hidden sm:inline">Take Survey</span>
                                <span className="sm:hidden">Survey</span>
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                        
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-all duration-200 p-2 rounded-lg hover:bg-slate-100 hover:rotate-90"
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
