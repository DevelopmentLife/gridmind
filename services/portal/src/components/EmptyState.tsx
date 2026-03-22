"use client";

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, message, icon = "□", action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className="w-16 h-16 rounded-2xl bg-brand-slate flex items-center justify-center text-3xl mb-4"
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 className="text-brand-text-primary font-semibold text-base mb-2">{title}</h3>
      <p className="text-brand-text-muted text-sm max-w-xs leading-relaxed mb-6">{message}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 bg-brand-electric hover:bg-brand-electric/90 text-white font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-electric/50"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
