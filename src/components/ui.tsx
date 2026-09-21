import type { ReactNode } from 'react';
import type { PlayerStatus, RequestStatus } from '@/lib/types';

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? <p className="muted mt-1.5 text-sm">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface p-4 sm:p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? <p className="muted mt-0.5 text-xs">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="muted py-8 text-center text-sm">{children}</p>;
}

export function Alert({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
    success:
      'border-pitch-200 bg-pitch-50 text-pitch-900 dark:border-pitch-700 dark:bg-pitch-900/30 dark:text-pitch-100',
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  }[kind];

  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}

const STATUS_STYLE: Record<PlayerStatus | RequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  approved: 'bg-pitch-100 text-pitch-700 dark:bg-pitch-900 dark:text-pitch-100',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
};

const STATUS_LABEL: Record<PlayerStatus | RequestStatus, string> = {
  pending: '대기',
  approved: '승인',
  rejected: '반려',
};

export function StatusBadge({ status }: { status: PlayerStatus | RequestStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="surface px-4 py-3">
      <div className="muted text-xs font-medium">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
