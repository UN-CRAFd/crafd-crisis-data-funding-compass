/**
 * Shared SectionHeader component used across dashboard and chart components
 */

export interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
}

export const SectionHeader = ({ icon, title }: SectionHeaderProps) => (
    <div className="flex items-center gap-2 text-base sm:text-lg font-qanelas-subtitle font-black text-slate-800 mb-0 mt-0 uppercase">
        <span className="h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center">
            {icon}
        </span>
        <span className="leading-tight">{title}</span>
    </div>
);
