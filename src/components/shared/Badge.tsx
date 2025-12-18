/**
 * Shared Badge Component
 * Unified badge component used across the application for consistent styling
 */

interface BadgeProps {
    text: string;
    variant: 'blue' | 'emerald' | 'violet' | 'slate' | 'highlighted' | 'beta' | 'types' | 'indigo' | 'agency';
    className?: string;
    title?: string;
}

export const Badge = ({ text, variant, className = '', title }: BadgeProps) => {
    const variants = {
        blue: 'bg-[var(--brand-bg-light)] text-[var(--brand-primary)]',
        emerald: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700',
        indigo: 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] font-semibold',
        agency: 'bg-[var(--badge-agency-bg)] text-[var(--badge-agency-text)]',
        types: 'bg-green-50 text-green-700',
        slate: 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-text)]',
        highlighted: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-border)] font-semibold',
        beta: ''
    };

    if (variant === 'beta') {
        return (
            <span
                className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-semibold break-words ${className}`}
                style={{
                    backgroundColor: 'var(--badge-beta-bg)',
                    color: 'var(--badge-beta-text)'
                }}
                title={title}
            >
                {text}
            </span>
        );
    }

    return (
        <span 
            className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium break-words ${variants[variant]} ${className}`}
            title={title}
        >
            {text}
        </span>
    );
};
