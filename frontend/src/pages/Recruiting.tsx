import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createCandidate,
  deleteCandidate,
  getCandidates,
  getEmployees,
  getPositions,
  updateCandidate,
  type Candidate,
  type Employee,
  type Position,
} from '@/api/index'
import { EmptyState, LoadingState, ModalShell, PageHeader, StatCard } from '@/components/ui'

const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected']

const stageBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  screening: 'bg-amber-50 text-amber-700',
  interview: 'bg-indigo-50 text-indigo-700',
  offer: 'bg-purple-50 text-purple-700',
  hired: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
}

const stageToneMap: Record<string, 'blue' | 'green' | 'amber' | 'rose' | 'slate'> = {
  new: 'blue',
  screening: 'amber',
  interview: 'slate',
  offer: 'blue',
  hired: 'green',
  rejected: 'rose',
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  position_id: '',
  owner_id: '',
  stage: 'new',
  source: '',
  notes: '',
}

export default function Recruiting() {
  const { t } = useTranslation()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    getCandidates()
      .then((data) => {
        setCandidates(data.items || [])
      })
      .catch(() => {
        setError(t('common.error'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    Promise.all([getPositions(), getEmployees()]).then(([positionData, employeeData]) => {
      setPositions(positionData || [])
      setEmployees(employeeData.items || [])
    })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const candidatesByStage = useMemo(() => {
    const map: Record<string, Candidate[]> = {}
    STAGES.forEach((stage) => {
      map[stage] = []
    })
    candidates.forEach((candidate) => {
      const stage = candidate.stage || 'new'
      if (!map[stage]) map[stage] = []
      map[stage].push(candidate)
    })
    return map
  }, [candidates])

  const openAddModal = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEditModal = (candidate: Candidate) => {
    setEditingId(candidate.id)
    setForm({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      position_id: candidate.position_id ? String(candidate.position_id) : '',
      owner_id: candidate.owner_id ? String(candidate.owner_id) : '',
      stage: candidate.stage || 'new',
      source: candidate.source || '',
      notes: candidate.notes || '',
    })
    setModalOpen(true)
  }

  const submit = () => {
    if (!form.name.trim()) return
    setSubmitting(true)
    const payload = {
      ...form,
      name: form.name.trim(),
      position_id: form.position_id ? Number(form.position_id) : null,
      owner_id: form.owner_id ? Number(form.owner_id) : null,
    }
    const request = editingId ? updateCandidate(editingId, payload) : createCandidate(payload)
    request
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  const handleDelete = () => {
    if (!editingId) return
    if (!window.confirm(t('recruiting.deleteConfirm'))) return
    setSubmitting(true)
    deleteCandidate(editingId)
      .then(() => {
        setModalOpen(false)
        loadData()
      })
      .catch(() => alert(t('common.error')))
      .finally(() => setSubmitting(false))
  }

  if (loading && !candidates.length) return <LoadingState label={`${t('common.loading')}...`} />

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('recruiting.title')}
        description={t('recruiting.subtitle')}
        actions={<button type="button" className="btn-primary" onClick={openAddModal}>{t('recruiting.addCandidate')}</button>}
        meta={<div className="meta-chip">{t('recruiting.totalCandidates')}: {candidates.length}</div>}
      />

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t('recruiting.totalCandidates')} value={candidates.length} tone="blue" />
        {STAGES.map((stage) => (
          <StatCard
            key={stage}
            label={t(`recruiting.stages.${stage}`)}
            value={candidatesByStage[stage]?.length || 0}
            tone={stageToneMap[stage] || 'blue'}
          />
        ))}
      </section>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="page-enter flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="flex min-w-[280px] flex-1 flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t(`recruiting.stages.${stage}`)}</h3>
              <span className="pill text-xs">{candidatesByStage[stage]?.length || 0}</span>
            </div>
            {candidatesByStage[stage]?.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">{t('recruiting.empty')}</div>
            ) : (
              candidatesByStage[stage]?.map((candidate) => (
                <div
                  key={candidate.id}
                  className="surface-panel cursor-pointer p-4 transition hover:shadow-md"
                  onClick={() => openEditModal(candidate)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <strong className="text-[var(--text-primary)]">{candidate.name}</strong>
                    <span className={`status-badge ${stageBadgeClasses[candidate.stage] || stageBadgeClasses.new}`}>
                      {t(`recruiting.stages.${candidate.stage}`)}
                    </span>
                  </div>
                  {candidate.position_title && (
                    <div className="text-sm text-[var(--text-secondary)]">{candidate.position_title}</div>
                  )}
                  {candidate.owner_name && (
                    <div className="text-sm text-[var(--text-secondary)]">{t('recruiting.owner')}: {candidate.owner_name}</div>
                  )}
                  {candidate.source && (
                    <div className="text-sm text-[var(--text-secondary)]">{t('recruiting.source')}: {candidate.source}</div>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {modalOpen && (
        <ModalShell
          title={editingId ? t('recruiting.editCandidate') : t('recruiting.addCandidate')}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              {editingId && (
                <button type="button" className="btn-danger" disabled={submitting} onClick={handleDelete}>{t('common.delete')}</button>
              )}
              <button type="button" className="btn-primary" disabled={submitting || !form.name.trim()} onClick={submit}>{submitting ? '...' : t('common.save')}</button>
            </>
          }
          maxWidthClassName="max-w-2xl"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
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
              <label className="field-label">{t('recruiting.position')}</label>
              <select className="field-select" value={form.position_id} onChange={(event) => setForm({ ...form, position_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.owner')}</label>
              <select className="field-select" value={form.owner_id} onChange={(event) => setForm({ ...form, owner_id: event.target.value })}>
                <option value="">{t('common.select')}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.stage')}</label>
              <select className="field-select" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                {STAGES.map((stage) => <option key={stage} value={stage}>{t(`recruiting.stages.${stage}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.source')}</label>
              <input className="field" value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.notes')}</label>
              <textarea className="field-area" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
