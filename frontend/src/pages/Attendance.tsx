import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAttendance, getAttendanceStats } from '@/api/index'
import { EmptyState, LoadingState, PageHeader, Panel, StatCard } from '@/components/ui'

interface AttendanceRecord {
  id: number
  employee_name: string
  date: string
  check_in: string
  check_out: string
  status: string
}

interface AttendanceStats {
  total_days: number
  normal_days: number
  late_days: number
  absent_days: number
  leave_days: number
  rate: number
}

const statusClasses: Record<string, string> = {
  normal: 'bg-emerald-50 text-emerald-700',
  late: 'bg-amber-50 text-amber-700',
  absent: 'bg-rose-50 text-rose-700',
  leave: 'bg-slate-100 text-slate-700',
}

export default function Attendance() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      getAttendance({ month, page, page_size: pageSize }),
      getAttendanceStats(month),
    ])
      .then(([attendanceData, statsData]) => {
        setRecords(attendanceData.items || [])
        setTotal(attendanceData.total || 0)
        setStats(statsData)
      })
      .finally(() => setLoading(false))
  }, [month, page])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (loading && !records.length) {
    return <LoadingState label={`${t('common.loading')}...`} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '月度追踪' : 'Monthly Tracking'}
        title={t('attendance.title')}
        description={t('attendance.subtitle')}
        meta={
          <div className="flex items-center gap-3">
            <div className="meta-chip">{t('common.total', { count: total })}</div>
            <input className="field !min-h-[2.8rem] !w-auto px-4" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1) }} />
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label={t('attendance.stats')} value={stats?.total_days ?? 0} hint="Tracked workdays" tone="blue" />
        <StatCard label={t('attendance.normal')} value={stats?.normal_days ?? 0} hint={`Late ${stats?.late_days ?? 0} / Leave ${stats?.leave_days ?? 0}`} tone="green" />
        <StatCard label={t('attendance.rate')} value={`${stats?.rate?.toFixed(1) ?? '0.0'}%`} hint={`Absent ${stats?.absent_days ?? 0}`} tone="amber" />
      </section>

      <Panel title={t('attendance.title')} description={isZh ? '表格行高、状态标签和列宽都重新整理过，每条记录终于像记录而不是挤压的表单。' : 'The table now uses balanced row height and clearer status chips so each day reads like a record, not a cramped spreadsheet.'}>
        {loading ? (
          <LoadingState label={`${t('common.loading')}...`} />
        ) : records.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            description={isZh ? '当前月份下没有符合条件的考勤记录。' : 'No attendance records match the selected month.'}
            icon={
              <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <circle cx="12" cy="12" r="8.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
              </svg>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[820px]">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('attendance.checkIn')}</th>
                    <th>{t('attendance.checkOut')}</th>
                    <th>{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.employee_name}</strong></td>
                      <td>{record.date}</td>
                      <td>{record.check_in || '-'}</td>
                      <td>{record.check_out || '-'}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[record.status] || statusClasses.normal}`}>
                          {t(`attendance.${record.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-5 flex flex-col gap-3 border-t border-[var(--border)] pt-5 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-[var(--text-secondary)]">{t('common.total', { count: total })}</div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                    {isZh ? '上一页' : 'Prev'}
                  </button>
                  <div className="pill">{page} / {totalPages}</div>
                  <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
                    {isZh ? '下一页' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  )
}
