import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getApprovals, getDashboardStats } from '@/api/index'
import { EmptyState, LoadingState, PageHeader, Panel, StatCard } from '@/components/ui'

interface DashboardData {
  total_employees: number
  active_employees: number
  attendance_rate: number
  pending_approvals: number
  department_count: number
}

interface ApprovalItem {
  id: number
  title: string
  type: string
  applicant_name: string
  state: string
  created_at: string
}

const stateClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_manager: 'bg-blue-50 text-blue-700',
  pending_hr: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [recentApprovals, setRecentApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getDashboardStats(), getApprovals({ page: 1, page_size: 6 })])
      .then(([statsData, approvalsData]) => {
        setStats(statsData)
        setRecentApprovals(approvalsData.items || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const healthRatio = useMemo(() => {
    if (!stats?.total_employees) return 0
    return Math.round((stats.active_employees / stats.total_employees) * 100)
  }, [stats])

  const formatDate = (value: string) => {
    if (!value) return '-'
    const date = new Date(value)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return <LoadingState label={`${t('common.loading')}...`} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '运营总览' : 'People Operations'}
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        meta={
          <div className="meta-chip">
            <span className="text-[var(--text-muted)]">{t('common.records')}</span>
            <strong className="text-[var(--text-primary)]">{stats?.total_employees ?? 0}</strong>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t('dashboard.totalEmployees')}
          value={stats?.total_employees ?? 0}
          hint={`${t('dashboard.departmentCount')}: ${stats?.department_count ?? 0}`}
          tone="blue"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="10" cy="7" r="4" />
              <path d="M20 8v6" />
              <path d="M23 11h-6" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.activeEmployees')}
          value={stats?.active_employees ?? 0}
          hint={isZh ? `在职占比 ${healthRatio}%` : `${healthRatio}% workforce active`}
          tone="green"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 4 4L19 6" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.attendanceRate')}
          value={`${stats?.attendance_rate?.toFixed(1) ?? '0.0'}%`}
          hint={isZh ? '当月情况' : 'Current month'}
          tone="amber"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7v5l3 2" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.pendingApprovals')}
          value={stats?.pending_approvals ?? 0}
          hint={isZh ? '待处理事项' : 'Needs action'}
          tone="rose"
          icon={
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
              <path d="M14 3v6h6" />
              <path d="M8 13h8" />
              <path d="M8 17h5" />
            </svg>
          }
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.8fr]">
        <Panel title={t('dashboard.recentApprovals')} description={isZh ? '最近审批改成更稳定的表格节奏，状态、标题和时间不再挤在一起。' : 'Latest approval requests with readable spacing and clearer status balance.'}>
          {recentApprovals.length === 0 ? (
            <EmptyState
              title={t('common.noData')}
              description={isZh ? '当前没有最近审批记录。' : 'No recent approvals are available.'}
              icon={
                <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v6h6" />
                </svg>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[760px]">
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
                      <td>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClasses[item.state] || stateClasses.draft}`}>
                          {t(`approval.${item.state === 'pending_manager' ? 'pendingManager' : item.state === 'pending_hr' ? 'pendingHr' : item.state}`)}
                        </span>
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title={isZh ? '运营摘要' : 'Operational Notes'} description={isZh ? '补充少量摘要卡片，让首页更完整，也更适合演示。' : 'Small summary cards to make the dashboard feel less empty and more presentation-ready.'}>
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(87,123,255,0.12),rgba(62,211,197,0.08))] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-strong)]">{isZh ? '覆盖率' : 'Coverage'}</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{healthRatio}%</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {isZh ? '在职占比仍然是判断组织运行健康度最直观的指标。' : 'Active workforce share remains the clearest signal for a healthy org overview.'}
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-white/80 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Departments</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{stats?.department_count ?? 0}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {isZh ? '统一卡片尺寸与字阶后，首页不会再出现信息很少但文字极小的失衡感。' : 'Balanced card sizing and restrained typography keep the whole screen from collapsing into tiny text.'}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
