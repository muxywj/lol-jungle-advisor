"use client";

interface Props {
  icon?: string;
  title: string;
  description?: string;
}

export default function EmptyState({ icon = "🎮", title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="text-base font-semibold text-slate-300">{title}</p>
      {description && (
        <p className="text-sm text-slate-500">{description}</p>
      )}
    </div>
  );
}
