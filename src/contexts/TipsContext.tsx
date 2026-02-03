"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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
    try {
      const stored = localStorage.getItem("tipsEnabled");
      if (stored !== null) {
        // Validate the stored value is a boolean before using it
        const parsed = JSON.parse(stored);
        if (typeof parsed === "boolean") {
          setTipsEnabled(parsed);
        }
      }
    } catch {
      // Invalid JSON or localStorage access error - use default value
      // Clear corrupted data
      try {
        localStorage.removeItem("tipsEnabled");
      } catch {
        // Ignore localStorage access errors
      }
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when changed
  const handleSetTipsEnabled = (enabled: boolean) => {
    setTipsEnabled(enabled);
    try {
      localStorage.setItem("tipsEnabled", JSON.stringify(enabled));
    } catch {
      // localStorage might be full or unavailable - fail silently
    }
  };

  // Don't render until hydrated to avoid hydration mismatch
  if (!isHydrated) {
    return <>{children}</>;
  }

  return (
    <TipsContext.Provider
      value={{ tipsEnabled, setTipsEnabled: handleSetTipsEnabled }}
    >
      {children}
    </TipsContext.Provider>
  );
}

export function useTips() {
  const context = useContext(TipsContext);
  if (context === undefined) {
    throw new Error("useTips must be used within TipsProvider");
  }
  return context;
}
