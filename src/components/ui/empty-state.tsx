import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  /** Rendered next to `action` for a lower-emphasis way out. */
  secondaryAction?: ReactNode;
  /** Small print under the actions, e.g. a reassurance or a next step. */
  footnote?: ReactNode;
}

/**
 * Shared empty / no-results state.
 *
 * Deliberately not a bare "No results found": the ui-ux-pro-max guidance for
 * empty states is "show helpful message and action, don't leave blank screens",
 * so every state here is given a title that explains the situation, a line that
 * says what to do next, and at least one way out.
 *
 * The API is unchanged apart from the two optional extras, so existing callers
 * (saved, leads, notifications, dashboard) keep working exactly as before.
 */
export function EmptyState({ icon, title, description, action, secondaryAction, footnote }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center sm:py-16">
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ecfdf5] text-[#047857]">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-bold tracking-tight text-[#1c1917]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#6b625b]">{description}</p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
      {footnote && (
        <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-[#a8a29e]">{footnote}</p>
      )}
    </div>
  );
}
