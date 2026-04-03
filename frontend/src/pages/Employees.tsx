import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createEmployee,
  deleteEmployee,
  getDepartments,
  getEmployees,
  getPositions,
  updateEmployee,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'

interface Employee {
  id: number
  name: string
  email: string
  phone: string
  gender: string
  department_id: number | null
  department_name: string
  position_id: number | null
  position_title: string
  hire_date: string
  status: string
  avatar?: string
  role: string
}

interface Department {
  id: number
  name: string
}

interface Position {
  id: number
  title: string
  department_id: number
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  gender: 'male',
  department_id: '',
  position_id: '',
  hire_date: '',
  status: 'active',
}

export default function Employees() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string | number> = { page, page_size: pageSize }
    if (search) params.search = search
    if (deptFilter) params.department_id = deptFilter

    getEmployees(params)
      .then((data) => {
        setEmployees(data.items || [])
        setTotal(data.total || 0)
      })
      .finally(() => setLoading(false))
  }, [deptFilter, page, search])

  useEffect(() => {
    getDepartments().then((data) => setDepartments(data.items || data || []))
    getPositions().then((data) => setPositions(data.items || data || []))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (employee: Employee) => {
    setEditingId(employee.id)
    setForm({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || 'male',
      department_id: employee.department_id ? String(employee.department_id) : '',
      position_id: employee.position_id ? String(employee.position_id) : '',
      hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
      status: employee.status || 'active',
    })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    setSubmitting(true)
    const payload = {
      ...form,
      department_id: form.department_id ? Number(form.department_id) : null,
      position_id: form.position_id ? Number(form.position_id) : null,
    }

    const action = editingId ? updateEmployee(editingId, payload) : createEmployee(payload)
    action
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (id: number) => {
    if (!window.confirm(t('employee.deleteConfirm'))) return
    deleteEmployee(id)
      .then(() => loadData())
      .catch(() => alert(t('common.error')))
  }

  const activeCount = useMemo(() => employees.filter((item) => item.status === 'active').length, [employees])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filteredPositions = form.department_id ? positions.filter((item) => item.department_id === Number(form.department_id)) : positions

  const initials = (value: string) =>
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?'

  if (loading && !employees.length) {
    return <LoadingState label={`${t('common.loading')}...`} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '人员名册' : 'Directory'}
        title={t('employee.title')}
        description={t('employee.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            {t('employee.addEmployee')}
          </button>
        }
        meta={<div className="meta-chip">{t('common.total', { count: total })}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.totalEmployees')} value={total} hint={`${departments.length} ${t('dashboard.departmentCount')}`} tone="blue" />
        <StatCard label={t('dashboard.activeEmployees')} value={activeCount} hint={`${total ? Math.round((activeCount / total) * 100) : 0}% active`} tone="green" />
        <StatCard label={t('common.department')} value={deptFilter ? departments.find((item) => String(item.id) === deptFilter)?.name || '-' : t('common.all')} hint={isZh ? '当前筛选' : 'Current filter'} tone="slate" />
      </section>

      <Panel title={t('common.search')} description={isZh ? '筛选栏统一成更大的输入控件和更合理的留白，搜索体验会立刻稳定很多。' : 'Larger controls, calmer spacing, and fewer cramped labels improve scan speed immediately.'}>
        <div className="grid gap-4 md:grid-cols-[1.5fr_0.8fr]">
          <div>
            <label className="field-label">{t('common.search')}</label>
            <input
              className="field"
              type="text"
              placeholder={`${t('common.search')}...`}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div>
            <label className="field-label">{t('common.department')}</label>
            <select
              className="field-select"
              value={deptFilter}
              onChange={(event) => {
                setDeptFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{t('common.all')}</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      <Panel title={t('employee.title')} description={isZh ? '头像、身份、部门、状态与操作列现在遵循同一套节奏，阅读不会再跳。' : 'Key employee information now keeps consistent rhythm across avatar, identity, status, and actions.'}>
        {loading ? (
          <LoadingState label={`${t('common.loading')}...`} />
        ) : employees.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            description={isZh ? '可以尝试调整搜索条件，或直接新增员工档案。' : 'Try a different search or add a new employee record.'}
            icon={
              <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
              </svg>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[980px]">
                <thead>
                  <tr>
                    <th>{t('employee.avatar')}</th>
                    <th>{t('common.name')}</th>
                    <th>{t('common.department')}</th>
                    <th>{t('common.position')}</th>
                    <th>{t('common.email')}</th>
                    <th>{t('common.phone')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#5d83ff,#3ed3c5)] text-sm font-semibold text-white">
                          {initials(employee.name)}
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <strong>{employee.name}</strong>
                          <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{employee.role || 'employee'}</div>
                        </div>
                      </td>
                      <td>{employee.department_name || '-'}</td>
                      <td>{employee.position_title || '-'}</td>
                      <td>{employee.email || '-'}</td>
                      <td>{employee.phone || '-'}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${employee.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {employee.status === 'active' ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button type="button" className="icon-button" onClick={() => openEditModal(employee)} title={t('common.edit')}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                            </svg>
                          </button>
                          <button type="button" className="icon-button" onClick={() => handleDelete(employee.id)} title={t('common.delete')}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4h8v2" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 6l-1 14H6L5 6" />
                            </svg>
                          </button>
                        </div>
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

      {modalOpen && (
        <ModalShell
          title={editingId ? t('employee.editEmployee') : t('employee.addEmployee')}
          subtitle={isZh ? '表单也统一使用全站相同的字段高度和间距比例。' : 'Use the same field sizes and spacing scale used across the rest of the system.'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-primary" disabled={submitting || !form.name.trim()} onClick={handleSubmit}>
                {submitting ? '...' : t('common.save')}
              </button>
            </>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">{t('common.name')}</label>
              <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.email')}</label>
              <input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.phone')}</label>
              <input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.gender')}</label>
              <select className="field-select" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}>
                <option value="male">{t('common.male')}</option>
                <option value="female">{t('common.female')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('common.status')}</label>
              <select className="field-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('common.department')}</label>
              <select
                className="field-select"
                value={form.department_id}
                onChange={(event) => setForm({ ...form, department_id: event.target.value, position_id: '' })}
              >
                <option value="">{t('common.select')}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">{t('common.position')}</label>
              <select className="field-select" value={form.position_id} onChange={(event) => setForm({ ...form, position_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {filteredPositions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('common.hireDate')}</label>
              <input className="field" type="date" value={form.hire_date} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
