import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createDepartment,
  createPosition,
  deleteDepartment,
  deletePosition,
  getDepartments,
  getEmployees,
  getPositions,
  updateDepartment,
  updatePosition,
  type Department,
  type Employee,
  type Position,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'

const emptyDeptForm = { name: '', description: '', manager_id: '', headcount_plan: 0 }
const emptyPositionForm = { title: '', department_id: '', level: '', description: '', headcount_plan: 0 }

export default function Departments() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [allPositions, setAllPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedDept, setSelectedDept] = useState('')
  const [loading, setLoading] = useState(true)
  const [deptModalOpen, setDeptModalOpen] = useState(false)
  const [positionModalOpen, setPositionModalOpen] = useState(false)
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null)
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null)
  const [deptForm, setDeptForm] = useState(emptyDeptForm)
  const [positionForm, setPositionForm] = useState(emptyPositionForm)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([getDepartments(), getPositions(selectedDept ? Number(selectedDept) : undefined), getPositions(), getEmployees({ page_size: 100 })])
      .then(([deptData, positionData, allPositionData, employeeData]) => {
        setDepartments(deptData || [])
        setPositions(positionData || [])
        setAllPositions(allPositionData || [])
        setEmployees(employeeData.items || [])
      })
      .finally(() => setLoading(false))
  }, [selectedDept])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPeople = useMemo(() => departments.reduce((sum, item) => sum + (item.employee_count || 0), 0), [departments])
  const totalPlan = useMemo(() => departments.reduce((sum, item) => sum + (item.headcount_plan || 0), 0), [departments])
  const managers = employees.filter((employee) => employee.role === 'manager' || employee.role === 'hr')

  const openDeptModal = (department?: Department) => {
    setEditingDeptId(department?.id ?? null)
    setDeptForm(department ? {
      name: department.name,
      description: department.description || '',
      manager_id: department.manager_id ? String(department.manager_id) : '',
      headcount_plan: department.headcount_plan || 0,
    } : emptyDeptForm)
    setDeptModalOpen(true)
  }

  const openPositionModal = (position?: Position, departmentId?: number) => {
    setEditingPositionId(position?.id ?? null)
    setPositionForm(position ? {
      title: position.title,
      department_id: String(position.department_id),
      level: position.level || '',
      description: position.description || '',
      headcount_plan: position.headcount_plan || 0,
    } : { ...emptyPositionForm, department_id: departmentId ? String(departmentId) : selectedDept })
    setPositionModalOpen(true)
  }

  const submitDepartment = () => {
    if (!deptForm.name.trim()) return
    setSubmitting(true)
    const payload = {
      name: deptForm.name.trim(),
      description: deptForm.description,
      manager_id: deptForm.manager_id ? Number(deptForm.manager_id) : null,
      headcount_plan: Number(deptForm.headcount_plan) || 0,
    }
    const request = editingDeptId ? updateDepartment(editingDeptId, payload) : createDepartment(payload)
    request.then(() => { setDeptModalOpen(false); loadData() }).catch(() => alert(t('common.error'))).finally(() => setSubmitting(false))
  }

  const submitPosition = () => {
    if (!positionForm.title.trim() || !positionForm.department_id) return
    setSubmitting(true)
    const payload = {
      title: positionForm.title.trim(),
      department_id: Number(positionForm.department_id),
      level: positionForm.level,
      description: positionForm.description,
      headcount_plan: Number(positionForm.headcount_plan) || 0,
    }
    const request = editingPositionId ? updatePosition(editingPositionId, payload) : createPosition(payload)
    request.then(() => { setPositionModalOpen(false); loadData() }).catch(() => alert(t('common.error'))).finally(() => setSubmitting(false))
  }

  const removeDepartment = (department: Department) => {
    if (department.employee_count > 0 || allPositions.some((position) => position.department_id === department.id)) {
      alert(t('department.deleteProtected'))
      return
    }
    if (!window.confirm(t('department.deleteConfirm'))) return
    deleteDepartment(department.id).then(loadData).catch(() => alert(t('common.error')))
  }

  const removePosition = (position: Position) => {
    if (position.employee_count > 0) {
      alert(t('department.positionDeleteProtected'))
      return
    }
    if (!window.confirm(t('department.positionDeleteConfirm'))) return
    deletePosition(position.id).then(loadData).catch(() => alert(t('common.error')))
  }

  if (loading && !departments.length) return <LoadingState label={`${t('common.loading')}...`} />

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '组织与职位' : 'Organization'}
        title={t('department.title')}
        description={t('department.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => openPositionModal()}>{t('department.addPosition')}</button>
            <button type="button" className="btn-primary" onClick={() => openDeptModal()}>{t('department.addDepartment')}</button>
          </div>
        }
        meta={<div className="meta-chip">{t('common.total', { count: departments.length })}</div>}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label={t('dashboard.departmentCount')} value={departments.length} hint={t('department.departmentHint')} tone="blue" />
        <StatCard label={t('department.employeeCount')} value={totalPeople} hint={t('department.peopleHint')} tone="green" />
        <StatCard label={t('department.headcountPlan')} value={totalPlan} hint={t('department.planHint')} tone="amber" />
        <StatCard label={t('dashboard.positionCount')} value={allPositions.length} hint={t('department.positionHint')} tone="slate" />
      </section>

      <Panel title={t('department.title')} description={t('department.tableDescription')}>
        {departments.length === 0 ? <EmptyState title={t('common.noData')} /> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {departments.map((department) => {
              const plan = department.headcount_plan || 0
              const ratio = plan ? Math.round((department.employee_count / plan) * 100) : 0
              return (
                <article key={department.id} className="surface-panel p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{department.name}</h3>
                      <p className="mt-2 min-h-[3rem] text-sm leading-6 text-[var(--text-secondary)]">{department.description || '-'}</p>
                    </div>
                    <span className="status-badge bg-blue-50 text-blue-700">{ratio}%</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div className="info-cell"><span>{t('department.manager')}</span><strong>{department.manager_name || '-'}</strong></div>
                    <div className="info-cell"><span>{t('department.employeeCount')}</span><strong>{department.employee_count} / {department.headcount_plan || 0}</strong></div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="button" className="btn-secondary flex-1" onClick={() => { setSelectedDept(String(department.id)); openPositionModal(undefined, department.id) }}>{t('department.addPosition')}</button>
                    <button type="button" className="btn-secondary" onClick={() => openDeptModal(department)}>{t('common.edit')}</button>
                    <button type="button" className="btn-secondary" onClick={() => removeDepartment(department)}>{t('common.delete')}</button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel title={t('department.positions')} description={t('department.positionDescription')} action={
        <select className="field-select !min-h-[3rem] !w-auto" value={selectedDept} onChange={(event) => setSelectedDept(event.target.value)}>
          <option value="">{t('common.all')}</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      }>
        {positions.length === 0 ? <EmptyState title={t('common.noData')} description={t('department.positionEmpty')} /> : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[920px]">
              <thead>
                <tr>
                  <th>{t('common.position')}</th>
                  <th>{t('common.department')}</th>
                  <th>{t('common.level')}</th>
                  <th>{t('common.description')}</th>
                  <th>{t('department.employeeCount')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id}>
                    <td><strong>{position.title}</strong></td>
                    <td>{position.department_name}</td>
                    <td>{position.level || '-'}</td>
                    <td>{position.description || '-'}</td>
                    <td>{position.employee_count} / {position.headcount_plan || 0}</td>
                    <td>
                      <div className="flex gap-2">
                        <button type="button" className="btn-secondary" onClick={() => openPositionModal(position)}>{t('common.edit')}</button>
                        <button type="button" className="btn-secondary" onClick={() => removePosition(position)}>{t('common.delete')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {deptModalOpen && (
        <ModalShell title={editingDeptId ? t('department.editDepartment') : t('department.addDepartment')} subtitle={t('department.formDescription')} onClose={() => setDeptModalOpen(false)} footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setDeptModalOpen(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn-primary" disabled={submitting || !deptForm.name.trim()} onClick={submitDepartment}>{submitting ? '...' : t('common.save')}</button>
          </>
        }>
          <div className="grid gap-5 md:grid-cols-2">
            <div><label className="field-label">{t('common.name')}</label><input className="field" value={deptForm.name} onChange={(event) => setDeptForm({ ...deptForm, name: event.target.value })} /></div>
            <div><label className="field-label">{t('department.headcountPlan')}</label><input className="field" type="number" value={deptForm.headcount_plan} onChange={(event) => setDeptForm({ ...deptForm, headcount_plan: Number(event.target.value) || 0 })} /></div>
            <div className="md:col-span-2"><label className="field-label">{t('department.manager')}</label><select className="field-select" value={deptForm.manager_id} onChange={(event) => setDeptForm({ ...deptForm, manager_id: event.target.value })}><option value="">{t('common.select')}</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select></div>
            <div className="md:col-span-2"><label className="field-label">{t('common.description')}</label><textarea className="field-area" value={deptForm.description} onChange={(event) => setDeptForm({ ...deptForm, description: event.target.value })} /></div>
          </div>
        </ModalShell>
      )}

      {positionModalOpen && (
        <ModalShell title={editingPositionId ? t('department.editPosition') : t('department.addPosition')} subtitle={t('department.positionFormDescription')} onClose={() => setPositionModalOpen(false)} footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPositionModalOpen(false)}>{t('common.cancel')}</button>
            <button type="button" className="btn-primary" disabled={submitting || !positionForm.title.trim() || !positionForm.department_id} onClick={submitPosition}>{submitting ? '...' : t('common.save')}</button>
          </>
        }>
          <div className="grid gap-5 md:grid-cols-2">
            <div><label className="field-label">{t('common.position')}</label><input className="field" value={positionForm.title} onChange={(event) => setPositionForm({ ...positionForm, title: event.target.value })} /></div>
            <div><label className="field-label">{t('common.department')}</label><select className="field-select" value={positionForm.department_id} onChange={(event) => setPositionForm({ ...positionForm, department_id: event.target.value })}><option value="">{t('common.select')}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></div>
            <div><label className="field-label">{t('common.level')}</label><input className="field" value={positionForm.level} onChange={(event) => setPositionForm({ ...positionForm, level: event.target.value })} /></div>
            <div><label className="field-label">{t('department.headcountPlan')}</label><input className="field" type="number" value={positionForm.headcount_plan} onChange={(event) => setPositionForm({ ...positionForm, headcount_plan: Number(event.target.value) || 0 })} /></div>
            <div className="md:col-span-2"><label className="field-label">{t('common.description')}</label><textarea className="field-area" value={positionForm.description} onChange={(event) => setPositionForm({ ...positionForm, description: event.target.value })} /></div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
