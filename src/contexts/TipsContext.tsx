'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TipsContextType {
    tipsEnabled: boolean;
    setTipsEnabled: (enabled: boolean) => void;
}

const TipsContext = createContext<TipsContextType | undefined>(undefined);

export function TipsProvider({ children }: { children: React.ReactNode }) {
    const [tipsEnabled, setTipsEnabled] = useState(true);
    const [isHydrated, setIsHydrated] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('tipsEnabled');
        if (stored !== null) {
            setTipsEnabled(JSON.parse(stored));
        }
        setIsHydrated(true);
    }, []);

    // Save to localStorage when changed
    const handleSetTipsEnabled = (enabled: boolean) => {
        setTipsEnabled(enabled);
        localStorage.setItem('tipsEnabled', JSON.stringify(enabled));
    };

    // Don't render until hydrated to avoid hydration mismatch
    if (!isHydrated) {
        return <>{children}</>;
    }

    return (
        <TipsContext.Provider value={{ tipsEnabled, setTipsEnabled: handleSetTipsEnabled }}>
            {children}
        </TipsContext.Provider>
    );
}

export function useTips() {
    const context = useContext(TipsContext);
    if (context === undefined) {
        throw new Error('useTips must be used within TipsProvider');
    }
    return context;
}
