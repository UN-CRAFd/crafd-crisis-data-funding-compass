"use client";

import { X } from "lucide-react";

interface CloseButtonProps {
  onClick: () => void;
  className?: string;
  absolute?: boolean;
}

export default function CloseButton({
  onClick,
  className = "",
  absolute = true,
}: CloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={` ${absolute ? "absolute top-4 right-4 z-50" : ""} flex h-12 w-12 shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full bg-slate-600 font-medium text-white shadow-lg transition-all duration-200 ease-out hover:bg-slate-700 focus:bg-slate-700 focus:outline-none sm:h-10 sm:w-auto sm:rounded-lg sm:bg-gray-200 sm:px-4 sm:text-sm sm:text-gray-600 sm:shadow-none sm:hover:bg-gray-400 sm:hover:text-gray-100 sm:focus:bg-gray-400 sm:focus:text-gray-100 ${className} `.trim()}
      aria-label="Close modal"
      title="Close modal"
    >
      <X className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">Close</span>
    </button>
  );
}
