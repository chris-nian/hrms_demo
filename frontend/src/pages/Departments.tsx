import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createDepartment, deleteDepartment, getDepartments, updateDepartment } from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'

interface Department {
  id: number
  name: string
  description: string
  employee_count: number
}

const emptyForm = { name: '', description: '' }

export default function Departments() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    getDepartments()
      .then((data) => setDepartments(data.items || data || []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalPeople = useMemo(() => departments.reduce((sum, item) => sum + (item.employee_count || 0), 0), [departments])

  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (department: Department) => {
    setEditingId(department.id)
    setForm({ name: department.name || '', description: department.description || '' })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    const action = editingId ? updateDepartment(editingId, form) : createDepartment(form)
    action
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const handleDelete = (id: number) => {
    if (!window.confirm(t('department.deleteConfirm'))) return
    deleteDepartment(id)
      .then(() => loadData())
      .catch(() => alert(t('common.error')))
  }

  if (loading && !departments.length) {
    return <LoadingState label={`${t('common.loading')}...`} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '组织结构' : 'Structure'}
        title={t('department.title')}
        description={t('department.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={openAddModal}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            {t('department.addDepartment')}
          </button>
        }
        meta={<div className="meta-chip">{t('common.total', { count: departments.length })}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.departmentCount')} value={departments.length} hint={isZh ? '业务单元' : 'Business units'} tone="blue" />
        <StatCard label={t('department.employeeCount')} value={totalPeople} hint="Distributed across cards" tone="green" />
        <StatCard
          label={t('common.description')}
          value={departments.filter((item) => item.description).length}
          hint={isZh ? '已填写描述' : 'Filled descriptions'}
          tone="slate"
        />
      </section>

      <Panel title={t('department.title')} description={isZh ? '部门卡片改成更清晰的层级、对比和留白，不再是零碎的小字堆叠。' : 'Cards now use stronger contrast, consistent spacing, and a readable information stack instead of tiny scattered labels.'}>
        {loading ? (
          <LoadingState label={`${t('common.loading')}...`} />
        ) : departments.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            description={isZh ? '新增部门后，这里会形成更清晰的组织结构视图。' : 'Add a department to populate the organization map.'}
            icon={
              <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V7l7-4 7 4v14" />
              </svg>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((department, index) => (
              <article
                key={department.id}
                className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(87,123,255,0.18),rgba(62,211,197,0.16))] text-[var(--accent-strong)]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 21V7l7-4 7 4v14" />
                    </svg>
                  </div>
                  <div className="pill">#{String(index + 1).padStart(2, '0')}</div>
                </div>

                <div className="mt-5 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{department.name}</h3>
                    <p className="mt-2 min-h-[4.5rem] text-sm leading-7 text-[var(--text-secondary)]">
                      {department.description || (isZh ? '暂未填写描述。' : 'No description yet.')}
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-white/70 px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">{t('department.employeeCount')}</span>
                    <strong className="text-lg text-[var(--text-primary)]">{department.employee_count || 0}</strong>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button type="button" className="btn-secondary flex-1" onClick={() => openEditModal(department)}>
                    {t('common.edit')}
                  </button>
                  <button type="button" className="btn-secondary flex-1" onClick={() => handleDelete(department.id)}>
                    {t('common.delete')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      {modalOpen && (
        <ModalShell
          title={editingId ? t('department.editDepartment') : t('department.addDepartment')}
          subtitle={isZh ? '部门表单也已经和员工、审批弹窗统一为同一套视觉节奏。' : 'Department forms now share the same visual rhythm as employee and approval dialogs.'}
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
          maxWidthClassName="max-w-xl"
        >
          <div>
            <label className="field-label">{t('common.name')}</label>
            <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </div>
          <div>
            <label className="field-label">{t('common.description')}</label>
            <textarea className="field-area" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </div>
        </ModalShell>
      )}
    </div>
  )
}
