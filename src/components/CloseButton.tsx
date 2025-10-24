'use client';

import { X } from 'lucide-react';

interface CloseButtonProps {
    onClick: () => void;
    className?: string;
    absolute?: boolean;
}

export default function CloseButton({ onClick, className = "", absolute = true }: CloseButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`
                ${absolute ? 'absolute top-4 right-4 z-50' : ''}
                flex items-center justify-center gap-2 h-12 w-12 sm:h-10 sm:w-auto sm:px-4 rounded-full sm:rounded-lg
                transition-all duration-200 ease-out touch-manipulation
                text-white bg-slate-600 hover:bg-slate-700 sm:text-gray-600 sm:bg-gray-200 sm:hover:bg-gray-400 sm:hover:text-gray-100 cursor-pointer
                focus:outline-none focus:bg-slate-700 sm:focus:bg-gray-400 sm:focus:text-gray-100 shrink-0
                sm:text-sm font-medium shadow-lg sm:shadow-none
                ${className}
            `.trim()}
            aria-label="Close modal"
            title="Close modal"
        >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Close</span>
        </button>
    );
}