"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface GeneralContributionsContextType {
  showGeneralContributions: boolean;
  setShowGeneralContributions: (enabled: boolean) => void;
}

const GeneralContributionsContext = createContext<
  GeneralContributionsContextType | undefined
>(undefined);

export const GeneralContributionsProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [showGeneralContributions, setShowGeneralContributions] =
    useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("showGeneralContributions");
      if (stored !== null) {
        // Validate the stored value is a valid string
        const isValid = stored === "true" || stored === "false";
        if (isValid) {
          setShowGeneralContributions(stored === "true");
        } else {
          // Clear invalid data
          localStorage.removeItem("showGeneralContributions");
        }
      }
    } catch {
      // localStorage access error - use default value silently
      // Avoid logging error objects which might contain sensitive info
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever state changes (only after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        "showGeneralContributions",
        String(showGeneralContributions),
      );
    } catch {
      // localStorage might be full or unavailable - fail silently
    }
  }, [showGeneralContributions, isLoaded]);

  return (
    <GeneralContributionsContext.Provider
      value={{ showGeneralContributions, setShowGeneralContributions }}
    >
      {children}
    </GeneralContributionsContext.Provider>
  );
};

export const useGeneralContributions = () => {
  const context = useContext(GeneralContributionsContext);
  if (!context) {
    throw new Error(
      "useGeneralContributions must be used within GeneralContributionsProvider",
    );
  }
  return context;
};
