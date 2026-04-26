import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createAttendance,
  getAttendance,
  getAttendanceStats,
  getEmployees,
  updateAttendance,
  type AttendanceRecord,
  type AttendanceStats,
  type Employee,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'

const emptyForm = {
  employee_id: '',
  date: '',
  check_in: '',
  check_out: '',
  status: 'normal',
}

const statusClasses: Record<string, string> = {
  normal: 'bg-emerald-50 text-emerald-700',
  late: 'bg-amber-50 text-amber-700',
  absent: 'bg-rose-50 text-rose-700',
  leave: 'bg-slate-100 text-slate-700',
}

function toLocalInput(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function todayString() {
  const now = new Date()
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default function Attendance() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const pageSize = 10

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      getAttendance({
        month,
        page,
        page_size: pageSize,
        employee_id: employeeFilter || undefined,
        status: statusFilter || undefined,
      }),
      getAttendanceStats(month),
    ])
      .then(([attendanceData, statsData]) => {
        setRecords(attendanceData.items || [])
        setTotal(attendanceData.total || 0)
        setStats(statsData)
      })
      .finally(() => setLoading(false))
  }, [employeeFilter, month, page, statusFilter])

  useEffect(() => {
    getEmployees({ page_size: 100, status: 'active' }).then((data) => setEmployees(data.items || []))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openAddModal = () => {
    setEditingId(null)
    setForm({ ...emptyForm, date: todayString(), employee_id: employeeFilter })
    setModalOpen(true)
  }

  const openEditModal = (record: AttendanceRecord) => {
    setEditingId(record.id)
    setForm({
      employee_id: String(record.employee_id),
      date: record.date,
      check_in: toLocalInput(record.check_in),
      check_out: toLocalInput(record.check_out),
      status: record.status,
    })
    setModalOpen(true)
  }

  const submit = () => {
    if (!form.employee_id || !form.date) return
    setSubmitting(true)
    const payload = {
      employee_id: Number(form.employee_id),
      date: form.date,
      check_in: form.check_in ? new Date(form.check_in).toISOString() : null,
      check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
      status: form.status,
    }
    const request = editingId ? updateAttendance(editingId, payload) : createAttendance(payload)
    request
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  if (loading && !records.length) return <LoadingState label={`${t('common.loading')}...`} />

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '月度台账' : 'Monthly Ledger'}
        title={t('attendance.title')}
        description={t('attendance.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={openAddModal}>{t('attendance.addRecord')}</button>}
        meta={<div className="meta-chip">{t('common.total', { count: total })}</div>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t('attendance.stats')} value={stats?.total_days ?? 0} hint={t('attendance.expectedDays')} tone="blue" />
        <StatCard label={t('attendance.normal')} value={stats?.normal_days ?? 0} hint={t('attendance.normalHint')} tone="green" />
        <StatCard label={t('attendance.late')} value={stats?.late_days ?? 0} hint={t('attendance.lateHint')} tone="amber" />
        <StatCard label={t('attendance.absent')} value={stats?.absent_days ?? 0} hint={t('attendance.absentHint')} tone="rose" />
        <StatCard label={t('attendance.rate')} value={`${stats?.rate?.toFixed(1) ?? '0.0'}%`} hint={t('attendance.rateHint')} tone="slate" />
      </section>

      <Panel title={t('common.search')} description={t('attendance.filterDescription')}>
        <div className="grid gap-4 md:grid-cols-4">
          <input className="field" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setPage(1) }} />
          <select className="field-select" value={employeeFilter} onChange={(event) => { setEmployeeFilter(event.target.value); setPage(1) }}>
            <option value="">{t('attendance.allEmployees')}</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <select className="field-select" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}>
            <option value="">{t('common.all')}</option>
            {['normal', 'late', 'absent', 'leave'].map((status) => <option key={status} value={status}>{t(`attendance.${status}`)}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={() => { setEmployeeFilter(''); setStatusFilter(''); setPage(1) }}>{t('common.reset')}</button>
        </div>
      </Panel>

      <Panel title={t('attendance.title')} description={t('attendance.tableDescription')}>
        {loading ? (
          <LoadingState label={`${t('common.loading')}...`} />
        ) : records.length === 0 ? (
          <EmptyState title={t('common.noData')} description={t('attendance.empty')} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[900px]">
                <thead>
                  <tr>
                    <th>{t('common.name')}</th>
                    <th>{t('attendance.date')}</th>
                    <th>{t('attendance.checkIn')}</th>
                    <th>{t('attendance.checkOut')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td><strong>{record.employee_name}</strong></td>
                      <td>{record.date}</td>
                      <td>{formatDateTime(record.check_in)}</td>
                      <td>{formatDateTime(record.check_out)}</td>
                      <td><span className={`status-badge ${statusClasses[record.status] || statusClasses.normal}`}>{t(`attendance.${record.status}`)}</span></td>
                      <td><button type="button" className="btn-secondary" onClick={() => openEditModal(record)}>{t('common.edit')}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <span className="text-sm text-[var(--text-secondary)]">{t('common.total', { count: total })}</span>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>{t('common.prev')}</button>
                  <span className="pill">{page} / {totalPages}</span>
                  <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>{t('common.next')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      {modalOpen && (
        <ModalShell
          title={editingId ? t('attendance.editRecord') : t('attendance.addRecord')}
          subtitle={t('attendance.formDescription')}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" disabled={submitting || !form.employee_id || !form.date} onClick={submit}>{submitting ? '...' : t('common.save')}</button>
            </>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="field-label">{t('common.name')}</label>
              <select className="field-select" value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('attendance.date')}</label>
              <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('attendance.checkIn')}</label>
              <input className="field" type="datetime-local" value={form.check_in} onChange={(event) => setForm({ ...form, check_in: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('attendance.checkOut')}</label>
              <input className="field" type="datetime-local" value={form.check_out} onChange={(event) => setForm({ ...form, check_out: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('common.status')}</label>
              <select className="field-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {['normal', 'late', 'absent', 'leave'].map((status) => <option key={status} value={status}>{t(`attendance.${status}`)}</option>)}
              </select>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
