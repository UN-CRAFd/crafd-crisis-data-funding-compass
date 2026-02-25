/**
 * Shared SectionHeader component used across dashboard and chart components
 */

export interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  isActive?: boolean;
}

export const SectionHeader = ({
  icon,
  title,
  isActive = false,
}: SectionHeaderProps) => (
  <div
    className={`font-qanelas-subtitle mt-0 mb-0 flex items-center gap-2 text-base font-black uppercase sm:text-lg ${isActive ? "text-[var(--brand-primary)]" : "text-slate-800"}`}
  >
    <span className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6">
      {icon}
    </span>
    <span className="leading-tight">{title}</span>
  </div>
);
