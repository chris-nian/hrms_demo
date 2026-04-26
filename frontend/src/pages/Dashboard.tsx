import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState, LoadingState, PageHeader, Panel, StatCard } from '@/components/ui'
import { getDashboardStats, type ApprovalItem, type DashboardStats } from '@/api/index'

const stateClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_manager: 'bg-blue-50 text-blue-700',
  pending_hr: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function stateKey(state: string) {
  return state === 'pending_manager' ? 'pendingManager' : state === 'pending_hr' ? 'pendingHr' : state
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState label={`${t('common.loading')}...`} />

  const recentApprovals: ApprovalItem[] = stats?.recent_approvals || []
  const maxDeptCount = Math.max(...(stats?.department_distribution || []).map((item) => item.count), 1)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '经营视图' : 'People Operations'}
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        meta={<div className="meta-chip">{t('common.records')}: {stats?.total_employees ?? 0}</div>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.activeEmployees')} value={stats?.active_employees ?? 0} hint={`${t('dashboard.totalEmployees')}: ${stats?.total_employees ?? 0}`} tone="green" />
        <StatCard label={t('dashboard.inactiveEmployees')} value={stats?.inactive_employees ?? 0} hint={t('dashboard.inactiveHint')} tone="slate" />
        <StatCard label={t('dashboard.attendanceRate')} value={`${stats?.attendance_rate?.toFixed(1) ?? '0.0'}%`} hint={`${t('dashboard.abnormalAttendance')}: ${stats?.abnormal_attendance_count ?? 0}`} tone="amber" />
        <StatCard label={t('dashboard.pendingApprovals')} value={stats?.pending_approvals ?? 0} hint={t('dashboard.pendingHint')} tone="blue" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.departmentCount')} value={stats?.department_count ?? 0} hint={t('dashboard.departmentHint')} tone="blue" />
        <StatCard label={t('dashboard.positionCount')} value={stats?.position_count ?? 0} hint={t('dashboard.positionHint')} tone="slate" />
        <StatCard label={t('dashboard.contracts30')} value={stats?.contracts_expiring_30 ?? 0} hint={t('dashboard.contractsHint')} tone="rose" />
        <StatCard label={t('dashboard.salaryCoverage')} value={`${stats?.salary_config_coverage?.toFixed(1) ?? '0.0'}%`} hint={t('dashboard.salaryCoverageHint')} tone="green" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Panel title={t('dashboard.departmentDistribution')} description={t('dashboard.departmentDistributionDescription')}>
          {(stats?.department_distribution || []).length === 0 ? <EmptyState title={t('common.noData')} /> : (
            <div className="space-y-4">
              {(stats?.department_distribution || []).map((item) => (
                <div key={item.department_id}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                    <span className="text-[var(--text-secondary)]">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-blue-700" style={{ width: `${Math.max(4, (item.count / maxDeptCount) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t('dashboard.contracts')} description={t('dashboard.contractDescription')}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="info-cell"><span>{t('dashboard.contracts30')}</span><strong>{stats?.contracts_expiring_30 ?? 0}</strong></div>
            <div className="info-cell"><span>{t('dashboard.contracts60')}</span><strong>{stats?.contracts_expiring_60 ?? 0}</strong></div>
            <div className="info-cell"><span>{t('dashboard.salaryCoverage')}</span><strong>{stats?.salary_config_coverage?.toFixed(1) ?? '0.0'}%</strong></div>
          </div>
        </Panel>
      </div>

      <Panel title={t('dashboard.recentApprovals')} description={t('dashboard.recentApprovalsDescription')}>
        {recentApprovals.length === 0 ? <EmptyState title={t('common.noData')} description={t('dashboard.emptyApprovals')} /> : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[820px]">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('approval.type')}</th>
                  <th>{t('approval.applicant')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('attendance.date')}</th>
                </tr>
              </thead>
              <tbody>
                {recentApprovals.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong></td>
                    <td>{t(`approval.${item.type === 'salary_adjust' ? 'salaryAdjust' : item.type}`)}</td>
                    <td>{item.applicant_name}</td>
                    <td><span className={`status-badge ${stateClasses[item.state] || stateClasses.draft}`}>{t(`approval.${stateKey(item.state)}`)}</span></td>
                    <td>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
