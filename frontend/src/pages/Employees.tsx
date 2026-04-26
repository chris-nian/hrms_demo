import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createEmployee,
  getDepartments,
  getEmployees,
  getPositions,
  updateEmployee,
  type Department,
  type Employee,
  type Position,
  type Role,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'

const emptyForm = {
  employee_no: '',
  name: '',
  email: '',
  phone: '',
  gender: 'male',
  department_id: '',
  position_id: '',
  manager_id: '',
  work_location: '',
  employment_type: 'full_time',
  contract_end_date: '',
  emergency_contact: '',
  emergency_phone: '',
  hire_date: '',
  status: 'active',
  role: 'employee',
}

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-700',
}

export default function Employees() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [total, setTotal] = useState(0)
  const [activeTotal, setActiveTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState<Employee | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const pageSize = 10

  const loadData = useCallback(() => {
    setLoading(true)
    getEmployees({
      page,
      page_size: pageSize,
      search: search || undefined,
      department_id: deptFilter || undefined,
      status: statusFilter || undefined,
      employment_type: typeFilter || undefined,
    })
      .then((data) => {
        setEmployees(data.items || [])
        setTotal(data.total || 0)
        setActiveTotal(data.active_total ?? (data.items || []).filter((item) => item.status === 'active').length)
      })
      .finally(() => setLoading(false))
  }, [deptFilter, page, search, statusFilter, typeFilter])

  useEffect(() => {
    Promise.all([getDepartments(), getPositions()]).then(([deptData, positionData]) => {
      setDepartments(deptData || [])
      setPositions(positionData || [])
    })
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
      employee_no: employee.employee_no || '',
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      gender: employee.gender || 'male',
      department_id: employee.department_id ? String(employee.department_id) : '',
      position_id: employee.position_id ? String(employee.position_id) : '',
      manager_id: employee.manager_id ? String(employee.manager_id) : '',
      work_location: employee.work_location || '',
      employment_type: employee.employment_type || 'full_time',
      contract_end_date: employee.contract_end_date || '',
      emergency_contact: employee.emergency_contact || '',
      emergency_phone: employee.emergency_phone || '',
      hire_date: employee.hire_date || '',
      status: employee.status || 'active',
      role: employee.role || 'employee',
    })
    setModalOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    const payload = {
      ...form,
      name: form.name.trim(),
      employee_no: form.employee_no || undefined,
      department_id: form.department_id ? Number(form.department_id) : null,
      position_id: form.position_id ? Number(form.position_id) : null,
      manager_id: form.manager_id ? Number(form.manager_id) : null,
      role: form.role as Role,
    }
    const request = editingId ? updateEmployee(editingId, payload) : createEmployee(payload)
    request
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const setEmployeeStatus = (employee: Employee, status: string) => {
    updateEmployee(employee.id, {
      employee_no: employee.employee_no,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      gender: employee.gender,
      department_id: employee.department_id,
      position_id: employee.position_id,
      manager_id: employee.manager_id,
      work_location: employee.work_location,
      employment_type: employee.employment_type,
      contract_end_date: employee.contract_end_date,
      emergency_contact: employee.emergency_contact,
      emergency_phone: employee.emergency_phone,
      hire_date: employee.hire_date,
      role: employee.role,
      status,
    }).then(loadData).catch(() => alert(t('common.error')))
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const filteredPositions = form.department_id ? positions.filter((item) => item.department_id === Number(form.department_id)) : positions
  const managerOptions = employees.filter((employee) => employee.role === 'manager' || employee.role === 'hr')
  const inactiveCount = Math.max(0, total - activeTotal)
  const roleLabel = (role: string) => t(role === 'manager' ? 'employee.managerRole' : `employee.${role}`)

  if (loading && !employees.length) return <LoadingState label={`${t('common.loading')}...`} />

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '人员档案' : 'Workforce'}
        title={t('employee.title')}
        description={t('employee.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={openAddModal}>{t('employee.addEmployee')}</button>}
        meta={<div className="meta-chip">{t('common.total', { count: total })}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.totalEmployees')} value={total} hint={t('employee.totalHint')} tone="blue" />
        <StatCard label={t('dashboard.activeEmployees')} value={activeTotal} hint={t('employee.activeHint')} tone="green" />
        <StatCard label={t('employee.inactiveEmployees')} value={inactiveCount} hint={t('employee.inactiveHint')} tone="slate" />
      </section>

      <Panel title={t('common.search')} description={t('employee.filterDescription')}>
        <div className="grid gap-4 md:grid-cols-5">
          <input className="field md:col-span-2" value={search} placeholder={t('employee.searchPlaceholder')} onChange={(event) => { setSearch(event.target.value); setPage(1) }} />
          <select className="field-select" value={deptFilter} onChange={(event) => { setDeptFilter(event.target.value); setPage(1) }}>
            <option value="">{t('common.department')}</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select className="field-select" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1) }}>
            <option value="">{t('common.status')}</option>
            <option value="active">{t('common.active')}</option>
            <option value="inactive">{t('common.inactive')}</option>
          </select>
          <select className="field-select" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}>
            <option value="">{t('employee.employmentType')}</option>
            {['full_time', 'contractor', 'intern'].map((type) => <option key={type} value={type}>{t(`employee.${type}`)}</option>)}
          </select>
        </div>
      </Panel>

      <Panel title={t('employee.title')} description={t('employee.tableDescription')}>
        {loading ? <LoadingState label={`${t('common.loading')}...`} /> : employees.length === 0 ? <EmptyState title={t('common.noData')} description={t('employee.empty')} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table min-w-[1180px]">
                <thead>
                  <tr>
                    <th>{t('employee.employeeNo')}</th>
                    <th>{t('common.name')}</th>
                    <th>{t('common.department')}</th>
                    <th>{t('common.position')}</th>
                    <th>{t('employee.manager')}</th>
                    <th>{t('employee.location')}</th>
                    <th>{t('employee.employmentType')}</th>
                    <th>{t('common.hireDate')}</th>
                    <th>{t('common.status')}</th>
                    <th>{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td><strong>{employee.employee_no || '-'}</strong></td>
                      <td>
                        <button type="button" className="text-left font-semibold text-[var(--text-primary)]" onClick={() => setDetail(employee)}>
                          {employee.name}
                          <span className="block text-xs font-normal text-[var(--text-muted)]">{employee.email || employee.phone || '-'}</span>
                        </button>
                      </td>
                      <td>{employee.department_name || '-'}</td>
                      <td>{employee.position_title || '-'}</td>
                      <td>{employee.manager_name || '-'}</td>
                      <td>{employee.work_location || '-'}</td>
                      <td>{t(`employee.${employee.employment_type || 'full_time'}`)}</td>
                      <td>{employee.hire_date || '-'}</td>
                      <td><span className={`status-badge ${statusClasses[employee.status] || statusClasses.inactive}`}>{employee.status === 'active' ? t('common.active') : t('common.inactive')}</span></td>
                      <td>
                        <div className="flex gap-2">
                          <button type="button" className="btn-secondary" onClick={() => openEditModal(employee)}>{t('common.edit')}</button>
                          <button type="button" className="btn-secondary" onClick={() => setEmployeeStatus(employee, employee.status === 'active' ? 'inactive' : 'active')}>
                            {employee.status === 'active' ? t('employee.deactivate') : t('employee.restore')}
                          </button>
                        </div>
                      </td>
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

      {detail && (
        <ModalShell title={detail.name} subtitle={`${detail.employee_no || '-'} · ${detail.department_name || '-'}`} onClose={() => setDetail(null)} maxWidthClassName="max-w-4xl">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="info-cell"><span>{t('common.position')}</span><strong>{detail.position_title || '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.manager')}</span><strong>{detail.manager_name || '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.location')}</span><strong>{detail.work_location || '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.contractEndDate')}</span><strong>{detail.contract_end_date || '-'}</strong></div>
            <div className="info-cell"><span>{t('salary.baseSalary')}</span><strong>{detail.base_salary ? `¥${detail.base_salary.toLocaleString()}` : '-'}</strong></div>
            <div className="info-cell"><span>{t('attendance.title')}</span><strong>{detail.recent_attendance_status ? t(`attendance.${detail.recent_attendance_status}`) : '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.emergencyContact')}</span><strong>{detail.emergency_contact || '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.emergencyPhone')}</span><strong>{detail.emergency_phone || '-'}</strong></div>
            <div className="info-cell"><span>{t('employee.role')}</span><strong>{roleLabel(detail.role)}</strong></div>
          </div>
        </ModalShell>
      )}

      {modalOpen && (
        <ModalShell
          title={editingId ? t('employee.editEmployee') : t('employee.addEmployee')}
          subtitle={t('employee.formDescription')}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" disabled={submitting || !form.name.trim()} onClick={submit}>{submitting ? '...' : t('common.save')}</button>
            </>
          }
          maxWidthClassName="max-w-4xl"
        >
          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="field-label">{t('employee.employeeNo')}</label>
              <input className="field" value={form.employee_no} onChange={(event) => setForm({ ...form, employee_no: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.name')}</label>
              <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('employee.role')}</label>
              <select className="field-select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                {['employee', 'manager', 'hr'].map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
            </div>
            <div><label className="field-label">{t('common.email')}</label><input className="field" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div><label className="field-label">{t('common.phone')}</label><input className="field" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div><label className="field-label">{t('common.gender')}</label><select className="field-select" value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })}><option value="male">{t('common.male')}</option><option value="female">{t('common.female')}</option></select></div>
            <div>
              <label className="field-label">{t('common.department')}</label>
              <select className="field-select" value={form.department_id} onChange={(event) => setForm({ ...form, department_id: event.target.value, position_id: '' })}>
                <option value="">{t('common.select')}</option>
                {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('common.position')}</label>
              <select className="field-select" value={form.position_id} onChange={(event) => setForm({ ...form, position_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {filteredPositions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('employee.manager')}</label>
              <select className="field-select" value={form.manager_id} onChange={(event) => setForm({ ...form, manager_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {managerOptions.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
              </select>
            </div>
            <div><label className="field-label">{t('employee.location')}</label><input className="field" value={form.work_location} onChange={(event) => setForm({ ...form, work_location: event.target.value })} /></div>
            <div><label className="field-label">{t('employee.employmentType')}</label><select className="field-select" value={form.employment_type} onChange={(event) => setForm({ ...form, employment_type: event.target.value })}>{['full_time', 'contractor', 'intern'].map((type) => <option key={type} value={type}>{t(`employee.${type}`)}</option>)}</select></div>
            <div><label className="field-label">{t('common.status')}</label><select className="field-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="active">{t('common.active')}</option><option value="inactive">{t('common.inactive')}</option></select></div>
            <div><label className="field-label">{t('common.hireDate')}</label><input className="field" type="date" value={form.hire_date} onChange={(event) => setForm({ ...form, hire_date: event.target.value })} /></div>
            <div><label className="field-label">{t('employee.contractEndDate')}</label><input className="field" type="date" value={form.contract_end_date} onChange={(event) => setForm({ ...form, contract_end_date: event.target.value })} /></div>
            <div><label className="field-label">{t('employee.emergencyContact')}</label><input className="field" value={form.emergency_contact} onChange={(event) => setForm({ ...form, emergency_contact: event.target.value })} /></div>
            <div><label className="field-label">{t('employee.emergencyPhone')}</label><input className="field" value={form.emergency_phone} onChange={(event) => setForm({ ...form, emergency_phone: event.target.value })} /></div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
