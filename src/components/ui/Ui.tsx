import type { ReactNode } from 'react';

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="glass-panel p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        {right}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
      <p className="text-base font-medium">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
