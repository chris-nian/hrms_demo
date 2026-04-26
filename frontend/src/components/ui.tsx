import type { ReactNode } from 'react'

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  meta?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions, meta }: PageHeaderProps) {
  return (
    <section className="surface-panel p-6 md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          {eyebrow && <div className="section-kicker">{eyebrow}</div>}
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)]">
              {description}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          {meta}
          {actions}
        </div>
      </div>
    </section>
  )
}

interface PanelProps {
  title?: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, description, action, children, className }: PanelProps) {
  return (
    <section className={cx('surface-panel p-6 md:p-7', className)}>
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            {title && <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>}
            {description && <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  tone?: 'blue' | 'green' | 'amber' | 'rose' | 'slate'
}

const toneClassMap: Record<NonNullable<StatCardProps['tone']>, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-700',
}

export function StatCard({ label, value, hint, icon, tone = 'blue' }: StatCardProps) {
  return (
    <div className="metric-card">
      <div className={cx('metric-card__icon', toneClassMap[tone])}>
        {icon}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
        <div className="text-3xl font-semibold text-[var(--text-primary)]">
          {value}
        </div>
        {hint && <div className="text-sm text-[var(--text-secondary)]">{hint}</div>}
      </div>
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h4>
        {description && <p className="mx-auto max-w-md text-sm leading-6 text-[var(--text-secondary)]">{description}</p>}
      </div>
    </div>
  )
}

export function LoadingState({ label }: { label: string }) {
  return (
    <div className="empty-state">
      <div className="h-11 w-11 animate-spin rounded-full border-4 border-[rgba(87,123,255,0.15)] border-t-[var(--accent)]" />
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  )
}

interface ModalShellProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
}

export function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidthClassName = 'max-w-2xl',
}: ModalShellProps) {
  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={cx('modal-card', maxWidthClassName)}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-button">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-5 px-6 py-6">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-5">{footer}</div>}
      </div>
    </div>
  )
}
