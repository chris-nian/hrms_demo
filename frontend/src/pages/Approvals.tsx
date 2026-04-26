import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  approveFlow,
  createApproval,
  getApproval,
  getApprovals,
  getEmployees,
  rejectFlow,
  type ApprovalItem,
  type Employee,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, Panel, StatCard } from '@/components/ui'
import { useAppStore } from '@/stores/appStore'

type TabKey = 'myApplications' | 'pendingMyApproval' | 'allApprovals'

const tabs: { key: TabKey; labelKey: string }[] = [
  { key: 'myApplications', labelKey: 'approval.myApplications' },
  { key: 'pendingMyApproval', labelKey: 'approval.pendingMyApproval' },
  { key: 'allApprovals', labelKey: 'approval.allApprovals' },
]

const stateClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_manager: 'bg-blue-50 text-blue-700',
  pending_hr: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const typeClasses: Record<string, string> = {
  leave: 'bg-cyan-50 text-cyan-700',
  salary_adjust: 'bg-amber-50 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
}

const detailLabels: Record<string, string> = {
  leave_type: 'approval.leaveType',
  start_date: 'approval.startDate',
  end_date: 'approval.endDate',
  reason: 'approval.reason',
  amount: 'approval.adjustAmount',
  new_base_salary: 'salary.baseSalary',
}

function formatDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function Approvals() {
  const { t, i18n } = useTranslation()
  const { currentRole } = useAppStore()
  const isZh = i18n.language === 'zh'
  const [activeTab, setActiveTab] = useState<TabKey>('pendingMyApproval')
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newType, setNewType] = useState('leave')
  const [newForm, setNewForm] = useState<Record<string, string>>({})
  const [applicantId, setApplicantId] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getEmployees({ page_size: 100, status: 'active' }).then((data) => {
      setEmployees(data.items || [])
      const first = data.items?.[0]
      if (first) setApplicantId(String(first.id))
    })
  }, [])

  const currentApprover = useMemo(() => {
    const roleEmployees = employees.filter((employee) => employee.role === currentRole)
    return roleEmployees[0] || employees[0]
  }, [currentRole, employees])

  const isCreateValid = useMemo(() => {
    if (!applicantId) return false
    if (newType === 'leave') return Boolean(newForm.start_date && newForm.end_date)
    if (newType === 'salary_adjust') return Boolean(newForm.amount || newForm.new_base_salary)
    return Boolean(newForm.reason)
  }, [applicantId, newForm, newType])

  const loadApprovals = useCallback(() => {
    setLoading(true)
    const params: Record<string, unknown> = { page: 1, page_size: 30 }
    if (activeTab === 'pendingMyApproval') {
      if (!currentApprover?.id) {
        setApprovals([])
        setLoading(false)
        return
      }
      params.approver_id = currentApprover.id
    }
    if (activeTab === 'myApplications' && applicantId) {
      params.applicant_id = applicantId
    }
    getApprovals(params)
      .then((data) => setApprovals(data.items || []))
      .finally(() => setLoading(false))
  }, [activeTab, applicantId, currentApprover?.id])

  useEffect(() => {
    loadApprovals()
  }, [loadApprovals])

  const openDetail = (item: ApprovalItem) => {
    setSelectedApproval(item)
    setDetailLoading(true)
    getApproval(item.id)
      .then((data) => setSelectedApproval(data))
      .finally(() => setDetailLoading(false))
  }

  const closeDetail = () => {
    setSelectedApproval(null)
    setComment('')
  }

  const handleCreateApproval = () => {
    if (!isCreateValid) return
    setSubmitting(true)
    const title =
      newType === 'leave'
        ? `${t('approval.leave')} - ${newForm.start_date || ''}`
        : newType === 'salary_adjust'
          ? `${t('approval.salaryAdjust')} - ${newForm.amount || newForm.new_base_salary || ''}`
          : newForm.reason || t('approval.other')

    createApproval({ title, type: newType, applicant_id: Number(applicantId), content: newForm })
      .then(() => {
        setNewModalOpen(false)
        setNewForm({})
        loadApprovals()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const handleAction = (action: 'approve' | 'reject') => {
    if (!selectedApproval?.current_approver_id || !currentApprover?.id) return
    setSubmitting(true)
    const payload = { approver_id: currentApprover.id, comment }
    const request = action === 'approve' ? approveFlow(selectedApproval.id, payload) : rejectFlow(selectedApproval.id, payload)
    request
      .then(() => {
        closeDetail()
        loadApprovals()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const summary = useMemo(() => ({
    pending: approvals.filter((item) => item.state.startsWith('pending')).length,
    approved: approvals.filter((item) => item.state === 'approved').length,
    rejected: approvals.filter((item) => item.state === 'rejected').length,
  }), [approvals])

  const canApprove =
    selectedApproval &&
    selectedApproval.current_approver_id &&
    selectedApproval.current_approver_id === currentApprover?.id &&
    ((currentRole === 'manager' && selectedApproval.state === 'pending_manager') ||
      (currentRole === 'hr' && selectedApproval.state === 'pending_hr'))

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '流程协同' : 'Workflow'}
        title={t('approval.title')}
        description={t('approval.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={() => { setNewType('leave'); setNewForm({}); setNewModalOpen(true) }}>{t('approval.newApplication')}</button>}
        meta={<div className="meta-chip">{t('approval.currentRole')}: {currentApprover?.name || currentRole}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.pendingApprovals')} value={summary.pending} hint={t('approval.pendingHint')} tone="blue" />
        <StatCard label={t('approval.approved')} value={summary.approved} hint={t('approval.approvedHint')} tone="green" />
        <StatCard label={t('approval.rejected')} value={summary.rejected} hint={t('approval.rejectedHint')} tone="rose" />
      </section>

      <Panel title={t('approval.queue')} description={t('approval.queueDescription')}>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" className={activeTab === tab.key ? 'btn-primary' : 'btn-secondary'} onClick={() => { setActiveTab(tab.key); setSelectedApproval(null) }}>
              {t(tab.labelKey)}
            </button>
          ))}
          {activeTab === 'myApplications' && (
            <select className="field-select !min-h-[3rem] !w-auto" value={applicantId} onChange={(event) => setApplicantId(event.target.value)}>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          )}
        </div>

        {selectedApproval ? (
          detailLoading ? <LoadingState label={`${t('common.loading')}...`} /> : (
            <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
              <section className="surface-panel p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className={`status-badge ${typeClasses[selectedApproval.type] || typeClasses.other}`}>{t(`approval.${selectedApproval.type === 'salary_adjust' ? 'salaryAdjust' : selectedApproval.type}`)}</span>
                    <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{selectedApproval.title}</h3>
                  </div>
                  <button type="button" className="btn-secondary" onClick={closeDetail}>{t('common.back')}</button>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="info-cell"><span>{t('approval.applicant')}</span><strong>{selectedApproval.applicant_name}</strong></div>
                  <div className="info-cell"><span>{t('common.status')}</span><strong>{t(`approval.${selectedApproval.state === 'pending_manager' ? 'pendingManager' : selectedApproval.state === 'pending_hr' ? 'pendingHr' : selectedApproval.state}`)}</strong></div>
                  <div className="info-cell"><span>{t('approval.currentApprover')}</span><strong>{selectedApproval.current_approver_name || '-'}</strong></div>
                </div>
                {selectedApproval.content && (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {Object.entries(selectedApproval.content).map(([key, value]) => value ? (
                      <div key={key} className="info-cell">
                        <span>{t(detailLabels[key] || key)}</span>
                        <strong>{String(value)}</strong>
                      </div>
                    ) : null)}
                  </div>
                )}
                {canApprove && (
                  <div className="mt-6 border-t border-[var(--border)] pt-5">
                    <label className="field-label">{t('approval.comment')}</label>
                    <textarea className="field-area" value={comment} onChange={(event) => setComment(event.target.value)} />
                    <div className="mt-4 flex gap-3">
                      <button type="button" className="btn-primary" disabled={submitting} onClick={() => handleAction('approve')}>{t('approval.approve')}</button>
                      <button type="button" className="btn-danger" disabled={submitting} onClick={() => handleAction('reject')}>{t('approval.reject')}</button>
                    </div>
                  </div>
                )}
              </section>

              <Panel title={t('approval.approvalFlow')} description={t('approval.flowDescription')}>
                {(selectedApproval.records || []).length === 0 ? <EmptyState title={t('common.noData')} /> : (
                  <div className="space-y-3">
                    {(selectedApproval.records || []).map((record) => (
                      <div key={record.id} className="timeline-item">
                        <div className="flex items-center justify-between gap-3">
                          <strong>{record.approver_name}</strong>
                          <span className={`status-badge ${record.action === 'approve' ? stateClasses.approved : record.action === 'reject' ? stateClasses.rejected : stateClasses.pending_manager}`}>
                            {record.action === 'approve' ? t('approval.approved') : record.action === 'reject' ? t('approval.rejected') : t('approval.submit')}
                          </span>
                        </div>
                        {record.comment && <p>{record.comment}</p>}
                        <time>{formatDate(record.created_at)}</time>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )
        ) : loading ? <LoadingState label={`${t('common.loading')}...`} /> : approvals.length === 0 ? (
          <EmptyState title={t('common.noData')} description={t('approval.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>{t('common.name')}</th>
                  <th>{t('approval.type')}</th>
                  <th>{t('approval.applicant')}</th>
                  <th>{t('approval.currentApprover')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('attendance.date')}</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((item) => (
                  <tr key={item.id} onClick={() => openDetail(item)} className="cursor-pointer">
                    <td><strong>{item.title}</strong></td>
                    <td><span className={`status-badge ${typeClasses[item.type] || typeClasses.other}`}>{t(`approval.${item.type === 'salary_adjust' ? 'salaryAdjust' : item.type}`)}</span></td>
                    <td>{item.applicant_name}</td>
                    <td>{item.current_approver_name || '-'}</td>
                    <td><span className={`status-badge ${stateClasses[item.state] || stateClasses.draft}`}>{t(`approval.${item.state === 'pending_manager' ? 'pendingManager' : item.state === 'pending_hr' ? 'pendingHr' : item.state}`)}</span></td>
                    <td>{formatDate(item.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {newModalOpen && (
        <ModalShell
          title={t('approval.newApplication')}
          subtitle={t('approval.formDescription')}
          onClose={() => setNewModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setNewModalOpen(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" disabled={submitting || !isCreateValid} onClick={handleCreateApproval}>{submitting ? '...' : t('approval.submit')}</button>
            </>
          }
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="field-label">{t('approval.applicant')}</label>
              <select className="field-select" value={applicantId} onChange={(event) => setApplicantId(event.target.value)}>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} - {employee.department_name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('approval.type')}</label>
              <select className="field-select" value={newType} onChange={(event) => { setNewType(event.target.value); setNewForm({}) }}>
                <option value="leave">{t('approval.leave')}</option>
                <option value="salary_adjust">{t('approval.salaryAdjust')}</option>
                <option value="other">{t('approval.other')}</option>
              </select>
            </div>
            {newType === 'leave' && (
              <>
                <div>
                  <label className="field-label">{t('approval.leaveType')}</label>
                  <select className="field-select" value={newForm.leave_type || 'annual'} onChange={(event) => setNewForm({ ...newForm, leave_type: event.target.value })}>
                    <option value="annual">{t('approval.annual')}</option>
                    <option value="personal">{t('approval.personal')}</option>
                    <option value="sick">{t('approval.sick')}</option>
                  </select>
                </div>
                <div />
                <div>
                  <label className="field-label">{t('approval.startDate')}</label>
                  <input className="field" type="date" value={newForm.start_date || ''} onChange={(event) => setNewForm({ ...newForm, start_date: event.target.value })} />
                </div>
                <div>
                  <label className="field-label">{t('approval.endDate')}</label>
                  <input className="field" type="date" value={newForm.end_date || ''} onChange={(event) => setNewForm({ ...newForm, end_date: event.target.value })} />
                </div>
              </>
            )}
            {newType === 'salary_adjust' && (
              <>
                <div>
                  <label className="field-label">{t('approval.adjustAmount')}</label>
                  <input className="field" type="number" value={newForm.amount || ''} onChange={(event) => setNewForm({ ...newForm, amount: event.target.value })} />
                </div>
                <div>
                  <label className="field-label">{t('salary.baseSalary')}</label>
                  <input className="field" type="number" value={newForm.new_base_salary || ''} onChange={(event) => setNewForm({ ...newForm, new_base_salary: event.target.value })} />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="field-label">{t('approval.reason')}</label>
              <textarea className="field-area" value={newForm.reason || ''} onChange={(event) => setNewForm({ ...newForm, reason: event.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
