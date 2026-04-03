import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { approveFlow, createApproval, getApproval, getApprovals, rejectFlow } from '@/api/index'
import { ModalShell, PageHeader, Panel, StatCard, EmptyState, LoadingState } from '@/components/ui'
import { useAppStore } from '@/stores/appStore'

interface ApprovalRecord {
  id: number
  approver_name: string
  action: string
  comment: string
  created_at: string
}

interface ApprovalItem {
  id: number
  title: string
  type: string
  state: string
  applicant_id: number
  applicant_name: string
  content: Record<string, unknown> | null
  current_approver_name?: string
  created_at: string
  updated_at: string
  records?: ApprovalRecord[]
}

type TabKey = 'myApplications' | 'pendingMyApproval' | 'allApprovals'

const tabs: { key: TabKey; labelKey: string }[] = [
  { key: 'myApplications', labelKey: 'approval.myApplications' },
  { key: 'pendingMyApproval', labelKey: 'approval.pendingMyApproval' },
  { key: 'allApprovals', labelKey: 'approval.allApprovals' },
]

const stateClasses: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending_manager: 'bg-blue-50 text-blue-700',
  pending_hr: 'bg-violet-50 text-violet-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const typeClasses: Record<string, string> = {
  leave: 'bg-cyan-50 text-cyan-700',
  salary_adjust: 'bg-amber-50 text-amber-700',
  other: 'bg-slate-100 text-slate-700',
}

export default function Approvals() {
  const { t, i18n } = useTranslation()
  const { currentRole } = useAppStore()
  const isZh = i18n.language === 'zh'
  const [activeTab, setActiveTab] = useState<TabKey>('myApplications')
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newType, setNewType] = useState('leave')
  const [newForm, setNewForm] = useState<Record<string, string>>({})
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadApprovals = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (activeTab === 'pendingMyApproval') {
      if (currentRole === 'manager') params.status = 'pending_manager'
      if (currentRole === 'hr') params.status = 'pending_hr'
    }

    getApprovals(params)
      .then((data) => setApprovals(data.items || []))
      .finally(() => setLoading(false))
  }, [activeTab, currentRole])

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
    setSubmitting(true)
    const content = { ...newForm, applicant_id: 1 }
    const title =
      newType === 'leave'
        ? `${t('approval.leave')} - ${newForm.leave_type || ''}`
        : newType === 'salary_adjust'
          ? `${t('approval.salaryAdjust')} - ${newForm.amount || ''}`
          : newForm.reason || t('approval.other')

    createApproval({ title, type: newType, content })
      .then(() => {
        setNewModalOpen(false)
        setNewForm({})
        loadApprovals()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const handleAction = (action: 'approve' | 'reject') => {
    if (!selectedApproval) return
    setSubmitting(true)
    const payload = { approver_id: selectedApproval.applicant_id || 1, comment }
    const request = action === 'approve' ? approveFlow(selectedApproval.id, payload) : rejectFlow(selectedApproval.id, payload)

    request
      .then(() => {
        closeDetail()
        loadApprovals()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const summary = useMemo(
    () => ({
      pending: approvals.filter((item) => item.state.startsWith('pending')).length,
      approved: approvals.filter((item) => item.state === 'approved').length,
      rejected: approvals.filter((item) => item.state === 'rejected').length,
    }),
    [approvals],
  )

  const canApprove =
    selectedApproval &&
    ((currentRole === 'manager' && selectedApproval.state === 'pending_manager') ||
      (currentRole === 'hr' && selectedApproval.state === 'pending_hr'))

  const formatDate = (value: string) => {
    if (!value) return '-'
    const date = new Date(value)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '流程协作' : 'Workflow'}
        title={t('approval.title')}
        description={t('approval.subtitle')}
        actions={
          <button type="button" className="btn-primary" onClick={() => { setNewType('leave'); setNewForm({}); setNewModalOpen(true) }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            {t('approval.newApplication')}
          </button>
        }
        meta={<div className="meta-chip">{t('approval.currentRole')}: {currentRole}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label={t('dashboard.pendingApprovals')} value={summary.pending} hint={isZh ? '等待处理' : 'Awaiting review'} tone="blue" />
        <StatCard label={t('approval.approved')} value={summary.approved} hint={isZh ? '已完成' : 'Closed successfully'} tone="green" />
        <StatCard label={t('approval.rejected')} value={summary.rejected} hint={isZh ? '需要跟进' : 'Needs follow-up'} tone="rose" />
      </section>

      <Panel title={isZh ? '审批队列' : 'Queue'} description={isZh ? '审批卡片与详情视图现在共享同一套层级和状态表达，查看路径更顺。' : 'Approval cards and detail view now share a clearer hierarchy, larger tap areas, and better state visibility.'}>
        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                setActiveTab(tab.key)
                setSelectedApproval(null)
              }}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {selectedApproval ? (
          detailLoading ? (
            <LoadingState label={`${t('common.loading')}...`} />
          ) : (
            <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-6">
                <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('approval.type')}</div>
                      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{selectedApproval.title}</h3>
                    </div>
                    <button type="button" className="btn-secondary" onClick={closeDetail}>
                      {t('common.cancel')}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[20px] border border-[var(--border)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('approval.applicant')}</div>
                      <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{selectedApproval.applicant_name}</div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--border)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('common.status')}</div>
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClasses[selectedApproval.state] || stateClasses.draft}`}>
                          {t(`approval.${selectedApproval.state === 'pending_manager' ? 'pendingManager' : selectedApproval.state === 'pending_hr' ? 'pendingHr' : selectedApproval.state}`)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--border)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('approval.type')}</div>
                      <div className="mt-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeClasses[selectedApproval.type] || typeClasses.other}`}>
                          {t(`approval.${selectedApproval.type === 'salary_adjust' ? 'salaryAdjust' : selectedApproval.type}`)}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-[var(--border)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{isZh ? '更新时间' : 'Updated'}</div>
                      <div className="mt-2 text-base font-semibold text-[var(--text-primary)]">{formatDate(selectedApproval.updated_at)}</div>
                    </div>
                  </div>

                  {selectedApproval.content && (
                    <div className="mt-5 space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{isZh ? '详细内容' : 'Details'}</div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {Object.entries(selectedApproval.content).map(([key, value]) => {
                          if (!value || key === 'applicant_id') return null
                          const labelKey = t(`approval.${key}`)
                          const displayKey = labelKey !== `approval.${key}` ? labelKey : key
                          return (
                            <div key={key} className="rounded-[18px] border border-[var(--border)] bg-white/70 px-4 py-3">
                              <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{displayKey}</div>
                              <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">{String(value)}</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>

                {canApprove && (
                  <section className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6">
                    <label className="field-label">{t('approval.comment')}</label>
                    <textarea className="field-area" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={`${t('approval.comment')}...`} />
                    <div className="mt-4 flex gap-3">
                      <button type="button" className="btn-primary" disabled={submitting} onClick={() => handleAction('approve')}>
                        {t('approval.approve')}
                      </button>
                      <button type="button" className="btn-danger" disabled={submitting} onClick={() => handleAction('reject')}>
                        {t('approval.reject')}
                      </button>
                    </div>
                  </section>
                )}
              </div>

              <Panel title={t('approval.approvalFlow')} description={isZh ? '审批历史重组为更大的时间线卡片，演示时讲解状态变化会更顺手。' : 'History is grouped into larger timeline cards so status changes are easier to narrate in a demo.'}>
                {(selectedApproval.records || []).length === 0 ? (
                  <EmptyState
                    title={t('common.noData')}
                    description={isZh ? '这条审批暂时还没有操作记录。' : 'This approval has no recorded actions yet.'}
                    icon={
                      <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 2" />
                        <circle cx="12" cy="12" r="8.5" />
                      </svg>
                    }
                  />
                ) : (
                  <div className="space-y-4">
                    {(selectedApproval.records || []).map((record) => (
                      <div key={record.id} className="rounded-[22px] border border-[var(--border)] bg-white/75 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <strong className="text-[var(--text-primary)]">{record.approver_name}</strong>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${record.action === 'approve' ? stateClasses.approved : record.action === 'reject' ? stateClasses.rejected : stateClasses.pending_manager}`}>
                            {record.action === 'approve' ? t('approval.approved') : record.action === 'reject' ? t('approval.rejected') : t('approval.submit')}
                          </span>
                        </div>
                        {record.comment && <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{record.comment}</p>}
                        <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{formatDate(record.created_at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )
        ) : loading ? (
          <LoadingState label={`${t('common.loading')}...`} />
        ) : approvals.length === 0 ? (
          <EmptyState
            title={t('common.noData')}
            description={isZh ? '当前队列中没有审批记录。' : 'There are no approvals in the current queue.'}
            icon={
              <svg className="h-14 w-14 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v6h6" />
              </svg>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {approvals.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openDetail(item)}
                className="rounded-[26px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,255,0.92))] p-6 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{item.title}</h3>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${stateClasses[item.state] || stateClasses.draft}`}>
                    {t(`approval.${item.state === 'pending_manager' ? 'pendingManager' : item.state === 'pending_hr' ? 'pendingHr' : item.state}`)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeClasses[item.type] || typeClasses.other}`}>
                    {t(`approval.${item.type === 'salary_adjust' ? 'salaryAdjust' : item.type}`)}
                  </span>
                  {item.current_approver_name && <span className="pill">{item.current_approver_name}</span>}
                </div>
                <div className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
                  <div>{t('approval.applicant')}: <strong className="text-[var(--text-primary)]">{item.applicant_name}</strong></div>
                  <div>{formatDate(item.created_at)}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      {newModalOpen && (
        <ModalShell
          title={t('approval.newApplication')}
          subtitle={isZh ? '审批表单也统一到整套新字号、间距和控件体系里了。' : 'All approval forms now follow the same spacing and typography system as the rest of the redesign.'}
          onClose={() => setNewModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setNewModalOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn-primary" disabled={submitting} onClick={handleCreateApproval}>
                {submitting ? '...' : t('approval.submit')}
              </button>
            </>
          }
        >
          <div>
            <label className="field-label">{t('approval.type')}</label>
            <select className="field-select" value={newType} onChange={(event) => { setNewType(event.target.value); setNewForm({}) }}>
              <option value="leave">{t('approval.leave')}</option>
              <option value="salary_adjust">{t('approval.salaryAdjust')}</option>
              <option value="other">{t('approval.other')}</option>
            </select>
          </div>

          {newType === 'leave' && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="field-label">{t('approval.leaveType')}</label>
                <select className="field-select" value={newForm.leave_type || ''} onChange={(event) => setNewForm({ ...newForm, leave_type: event.target.value })}>
                  <option value="annual">{t('approval.annual')}</option>
                  <option value="personal">{t('approval.personal')}</option>
                  <option value="sick">{t('approval.sick')}</option>
                </select>
              </div>
              <div>
                <label className="field-label">{t('approval.startDate')}</label>
                <input className="field" type="date" value={newForm.start_date || ''} onChange={(event) => setNewForm({ ...newForm, start_date: event.target.value })} />
              </div>
              <div>
                <label className="field-label">{t('approval.endDate')}</label>
                <input className="field" type="date" value={newForm.end_date || ''} onChange={(event) => setNewForm({ ...newForm, end_date: event.target.value })} />
              </div>
            </div>
          )}

          {newType === 'salary_adjust' && (
            <div>
              <label className="field-label">{t('approval.adjustAmount')}</label>
              <input className="field" type="number" value={newForm.amount || ''} onChange={(event) => setNewForm({ ...newForm, amount: event.target.value })} />
            </div>
          )}

          <div>
            <label className="field-label">{t('approval.reason')}</label>
            <textarea className="field-area" value={newForm.reason || ''} onChange={(event) => setNewForm({ ...newForm, reason: event.target.value })} />
          </div>
        </ModalShell>
      )}
    </div>
  )
}
