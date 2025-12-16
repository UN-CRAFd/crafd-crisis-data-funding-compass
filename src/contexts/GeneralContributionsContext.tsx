'use client';

import React, { createContext, useContext, useState } from 'react';

interface GeneralContributionsContextType {
    showGeneralContributions: boolean;
    setShowGeneralContributions: (enabled: boolean) => void;
}

const GeneralContributionsContext = createContext<GeneralContributionsContextType | undefined>(undefined);

export const GeneralContributionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showGeneralContributions, setShowGeneralContributions] = useState(true);

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
