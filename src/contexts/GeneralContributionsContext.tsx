'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface GeneralContributionsContextType {
    showGeneralContributions: boolean;
    setShowGeneralContributions: (enabled: boolean) => void;
}

const GeneralContributionsContext = createContext<GeneralContributionsContextType | undefined>(undefined);

export const GeneralContributionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showGeneralContributions, setShowGeneralContributions] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('showGeneralContributions');
            if (stored !== null) {
                setShowGeneralContributions(stored === 'true');
            }
        } catch (error) {
            console.warn('Failed to load General Contributions state from localStorage:', error);
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever state changes (only after initial load)
    useEffect(() => {
        if (!isLoaded) return;
        try {
            localStorage.setItem('showGeneralContributions', String(showGeneralContributions));
        } catch (error) {
            console.warn('Failed to save General Contributions state to localStorage:', error);
        }
    }, [showGeneralContributions, isLoaded]);

    return (
        <GeneralContributionsContext.Provider value={{ showGeneralContributions, setShowGeneralContributions }}>
            {children}
        </GeneralContributionsContext.Provider>
    );
};

export const useGeneralContributions = () => {
    const context = useContext(GeneralContributionsContext);
    if (!context) {
        throw new Error('useGeneralContributions must be used within GeneralContributionsProvider');
    }
    return context;
};
