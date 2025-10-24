import { 
    Database, 
    Server, 
    BarChart3, 
    Users, 
    Settings, 
    BookOpen, 
    HelpCircle 
} from 'lucide-react';
import React from 'react';

// Dictionary mapping investment types to their corresponding Lucide React icons
export const INVESTMENT_TYPE_ICON_MAP: Record<string, React.ComponentType<any>> = {
    'Data Sets & Commons': Database,
    'Infrastructure & Platforms': Server,
    'Crisis Analytics & Insights': BarChart3,
    'Human Capital & Know-how': Users,
    'Standards & Coordination': Settings,
    'Learning & Exchange': BookOpen,
    // Fallback for unknown types
    'default': HelpCircle
};

// Helper function to get icon for a given type
export const getIconForInvestmentType = (type: string): React.ComponentType<any> => {
    return INVESTMENT_TYPE_ICON_MAP[type] || INVESTMENT_TYPE_ICON_MAP['default'];
};