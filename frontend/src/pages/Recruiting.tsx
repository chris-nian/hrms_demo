import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  createCandidate, deleteCandidate, getCandidates, getCandidateDetail,
  getEmployees, getPositions, updateCandidate, updateCandidateStage,
  convertCandidate, createInterviewRound, updateInterviewRound,
  deleteInterviewRound, updateInterviewRoundStatus,
  getInterviewRounds, getMyInterviews, getEvaluations, createEvaluation,
  getEvaluationCriteria, getOffers, createOffer, updateOffer, updateOfferStatus,
  deleteOffer, createApproval,
  type Candidate, type Employee, type Position,
  type InterviewRound, type Evaluation, type EvaluationCriterion, type Offer,
} from '@/api/index'
import { useAppStore } from '@/stores/appStore'
import { EmptyState, LoadingState, ModalShell, PageHeader, StatCard } from '@/components/ui'

const STAGES = ['new', 'screening', 'phone_interview', 'onsite_interview', 'evaluation', 'offer_pending', 'offer_sent', 'offer_accepted', 'hired', 'rejected', 'withdrawn']

const stageBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  screening: 'bg-amber-50 text-amber-700',
  phone_interview: 'bg-indigo-50 text-indigo-700',
  onsite_interview: 'bg-violet-50 text-violet-700',
  evaluation: 'bg-cyan-50 text-cyan-700',
  offer_pending: 'bg-fuchsia-50 text-fuchsia-700',
  offer_sent: 'bg-purple-50 text-purple-700',
  offer_accepted: 'bg-emerald-50 text-emerald-700',
  hired: 'bg-green-50 text-green-700',
  rejected: 'bg-rose-50 text-rose-700',
  withdrawn: 'bg-gray-50 text-gray-700',
}

const stageToneMap: Record<string, 'blue' | 'green' | 'amber' | 'rose' | 'slate'> = {
  new: 'blue',
  screening: 'amber',
  phone_interview: 'slate',
  onsite_interview: 'slate',
  evaluation: 'blue',
  offer_pending: 'blue',
  offer_sent: 'blue',
  offer_accepted: 'green',
  hired: 'green',
  rejected: 'rose',
  withdrawn: 'rose',
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
  const navigate = useNavigate()
  const { currentRole } = useAppStore()
  const [currentUserId, setCurrentUserId] = useState<number>(0)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [filterOwner, setFilterOwner] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [myInterviews, setMyInterviews] = useState(false)

  // Detail modal
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null)
  const [detailTab, setDetailTab] = useState<'profile' | 'interviews' | 'evaluations' | 'offer' | 'timeline'>('profile')
  const [detailData, setDetailData] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Interview modal
  const [interviewModal, setInterviewModal] = useState(false)
  const [interviewForm, setInterviewForm] = useState({
    title: '', scheduled_date: '', start_time: '', end_time: '', mode: 'onsite', location: '', interviewer_ids: [] as number[],
  })
  const [editingInterviewId, setEditingInterviewId] = useState<number | null>(null)

  // Evaluation modal
  const [evalModal, setEvalModal] = useState(false)
  const [evalRoundId, setEvalRoundId] = useState<number | null>(null)
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([])
  const [evalForm, setEvalForm] = useState<{ scores: Record<number, number>; feedback: string; interviewer_id: number }>({
    scores: {}, feedback: '', interviewer_id: 0,
  })

  // Offer modal
  const [offerModal, setOfferModal] = useState(false)
  const [offerForm, setOfferForm] = useState({
    position_id: '', base_salary: '', bonus: '0', proposed_start_date: '', employment_type: 'full_time', work_location: '', notes: '',
  })
  const [editingOfferId, setEditingOfferId] = useState<number | null>(null)

  // Stage transition modal
  const [stageModal, setStageModal] = useState(false)
  const [stageForm, setStageForm] = useState({ stage: '', reason: '' })

  const loadData = useCallback(() => {
    setLoading(true)
    setError('')
    const params: Record<string, unknown> = {
      sort_by: sortBy,
      sort_order: sortOrder,
    }
    if (search) params.search = search
    if (filterStage) params.stage = filterStage
    if (filterPosition) params.position_id = Number(filterPosition)
    if (filterSource) params.source = filterSource
    if (filterOwner) params.owner_id = Number(filterOwner)

    if (myInterviews && currentUserId) {
      getMyInterviews(currentUserId)
        .then((data) => {
          const candidateIds = [...new Set((data.items || []).map((r: InterviewRound) => r.candidate_id))]
          if (candidateIds.length === 0) {
            setCandidates([])
            setLoading(false)
            return
          }
          getCandidates(params).then((cData) => {
            const filtered = (cData.items || []).filter((c: Candidate) => candidateIds.includes(c.id))
            setCandidates(filtered)
            setLoading(false)
          })
        })
        .catch(() => {
          setError(t('common.error'))
          setLoading(false)
        })
    } else {
      getCandidates(params)
        .then((data) => {
          setCandidates(data.items || [])
        })
        .catch(() => {
          setError(t('common.error'))
        })
        .finally(() => setLoading(false))
    }
  }, [t, search, filterStage, filterPosition, filterSource, filterOwner, sortBy, sortOrder, myInterviews, currentUserId])

  useEffect(() => {
    Promise.all([getPositions(), getEmployees()]).then(([positionData, employeeData]) => {
      setPositions(positionData || [])
      setEmployees(employeeData.items || [])
    })
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (detailCandidate) {
      setDetailLoading(true)
      getCandidateDetail(detailCandidate.id)
        .then((data) => setDetailData(data))
        .catch(() => setError(t('common.error')))
        .finally(() => setDetailLoading(false))
    }
  }, [detailCandidate, t])

  useEffect(() => {
    getEvaluationCriteria().then((data) => {
      setCriteria((data.items || []) as EvaluationCriterion[])
    })
  }, [])

  const candidatesByStage = useMemo(() => {
    const map: Record<string, Candidate[]> = {}
    STAGES.forEach((stage) => { map[stage] = [] })
    candidates.forEach((candidate) => {
      const stage = candidate.stage || 'new'
      if (!map[stage]) map[stage] = []
      map[stage].push(candidate)
    })
    return map
  }, [candidates])

  const uniqueSources = useMemo(() => [...new Set(candidates.map((c) => c.source).filter(Boolean))], [candidates])

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

  const openDetail = (candidate: Candidate) => {
    setDetailCandidate(candidate)
    setDetailTab('profile')
  }

  const handleStageUpdate = () => {
    if (!detailCandidate || !stageForm.stage) return
    updateCandidateStage(detailCandidate.id, { stage: stageForm.stage, reason: stageForm.reason || undefined })
      .then(() => {
        setStageModal(false)
        setStageForm({ stage: '', reason: '' })
        loadData()
        if (detailCandidate) {
          setDetailCandidate({ ...detailCandidate, stage: stageForm.stage })
          getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data))
        }
      })
      .catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const handleConvert = () => {
    if (!detailCandidate) return
    if (!window.confirm(t('recruiting.convertConfirm'))) return
    convertCandidate(detailCandidate.id)
      .then((res) => {
        alert(t('common.success'))
        loadData()
        navigate(`/employees`)
      })
      .catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const handleHireProposal = () => {
    if (!detailCandidate) return
    const manager = employees.find((e) => e.role === 'manager')
    if (!manager) {
      alert('No manager available')
      return
    }
    createApproval({
      title: `Hire Proposal: ${detailCandidate.name}`,
      type: 'hire_proposal',
      applicant_id: manager.id,
      content: {
        candidate_id: detailCandidate.id,
        position_id: detailCandidate.position_id,
        proposed_hire_date: detailData?.offers?.[0]?.proposed_start_date || new Date().toISOString().split('T')[0],
      },
    })
      .then(() => {
        alert(t('common.success'))
      })
      .catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const submitInterview = () => {
    if (!detailCandidate || !interviewForm.title || !interviewForm.scheduled_date || !interviewForm.start_time || !interviewForm.end_time) return
    const payload = {
      ...interviewForm,
      interviewer_ids: interviewForm.interviewer_ids,
      scheduled_date: interviewForm.scheduled_date,
      start_time: new Date(`${interviewForm.scheduled_date}T${interviewForm.start_time}`).toISOString(),
      end_time: new Date(`${interviewForm.scheduled_date}T${interviewForm.end_time}`).toISOString(),
    }
    const req = editingInterviewId
      ? updateInterviewRound(editingInterviewId, payload)
      : createInterviewRound(detailCandidate.id, payload)
    req.then(() => {
      setInterviewModal(false)
      setInterviewForm({ title: '', scheduled_date: '', start_time: '', end_time: '', mode: 'onsite', location: '', interviewer_ids: [] })
      setEditingInterviewId(null)
      getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data))
    }).catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const submitEvaluation = () => {
    if (!evalRoundId) return
    const scores = Object.entries(evalForm.scores).map(([criterion_id, score]) => ({ criterion_id: Number(criterion_id), score: Number(score) }))
    createEvaluation(evalRoundId, {
      scores,
      feedback: evalForm.feedback,
      interviewer_id: evalForm.interviewer_id || currentUserId || 0,
    }).then(() => {
      setEvalModal(false)
      setEvalForm({ scores: {}, feedback: '', interviewer_id: 0 })
      setEvalRoundId(null)
      if (detailCandidate) {
        getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data))
      }
    }).catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const submitOffer = () => {
    if (!detailCandidate) return
    const payload: Record<string, unknown> = {
      position_id: offerForm.position_id ? Number(offerForm.position_id) : undefined,
      base_salary: Number(offerForm.base_salary) || 0,
      bonus: Number(offerForm.bonus) || 0,
      proposed_start_date: offerForm.proposed_start_date || undefined,
      employment_type: offerForm.employment_type,
      work_location: offerForm.work_location || undefined,
      notes: offerForm.notes || undefined,
    }
    const req = editingOfferId ? updateOffer(editingOfferId, payload) : createOffer(detailCandidate.id, payload)
    req.then(() => {
      setOfferModal(false)
      setOfferForm({ position_id: '', base_salary: '', bonus: '0', proposed_start_date: '', employment_type: 'full_time', work_location: '', notes: '' })
      setEditingOfferId(null)
      getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data))
    }).catch((err: any) => alert(err.response?.data?.detail || t('common.error')))
  }

  const canManageInterviews = currentRole === 'hr' || currentRole === 'manager'
  const canManageOffers = currentRole === 'hr'
  const canConvert = currentRole === 'hr'
  const canHireProposal = currentRole === 'manager'

  if (loading && !candidates.length) return <LoadingState label={`${t('common.loading')}...`} />

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('recruiting.title')}
        description={t('recruiting.subtitle')}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select className="field-select text-sm py-1" value={currentUserId || ''} onChange={(e) => setCurrentUserId(Number(e.target.value))}>
                <option value="">{t('common.select')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <button type="button" className={`btn-secondary ${myInterviews ? 'ring-2 ring-[var(--accent)]' : ''}`} onClick={() => setMyInterviews((v) => !v)}>
                {t('recruiting.myInterviews')}
              </button>
            </div>
            <button type="button" className="btn-primary" onClick={openAddModal}>{t('recruiting.addCandidate')}</button>
          </div>
        }
        meta={<div className="meta-chip">{t('recruiting.totalCandidates')}: {candidates.length}</div>}
      />

      {/* Stats */}
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

      {/* Filters */}
      <section className="surface-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <input className="field min-w-[180px]" placeholder={t('recruiting.search')} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="field-select min-w-[140px]" value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
            <option value="">{t('recruiting.filterStage')}</option>
            {STAGES.map((s) => <option key={s} value={s}>{t(`recruiting.stages.${s}`)}</option>)}
          </select>
          <select className="field-select min-w-[140px]" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
            <option value="">{t('recruiting.filterPosition')}</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select className="field-select min-w-[140px]" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
            <option value="">{t('recruiting.filterSource')}</option>
            {uniqueSources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="field-select min-w-[140px]" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
            <option value="">{t('recruiting.filterOwner')}</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select className="field-select min-w-[120px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="created_at">{t('recruiting.sortBy')}</option>
            <option value="name">{t('common.name')}</option>
            <option value="stage">{t('recruiting.stage')}</option>
          </select>
          <select className="field-select min-w-[100px]" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">{t('common.prev')}</option>
            <option value="asc">{t('common.next')}</option>
          </select>
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" className={`px-3 py-2 text-sm rounded-md ${viewMode === 'kanban' ? 'bg-[var(--accent)] text-white' : 'bg-gray-100'}`} onClick={() => setViewMode('kanban')}>
              {t('recruiting.kanbanView')}
            </button>
            <button type="button" className={`px-3 py-2 text-sm rounded-md ${viewMode === 'list' ? 'bg-[var(--accent)] text-white' : 'bg-gray-100'}`} onClick={() => setViewMode('list')}>
              {t('recruiting.listView')}
            </button>
          </div>
        </div>
      </section>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
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
                    onClick={() => openDetail(candidate)}
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
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="surface-panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('common.name')}</th>
                <th>{t('recruiting.stage')}</th>
                <th>{t('recruiting.position')}</th>
                <th>{t('recruiting.owner')}</th>
                <th>{t('recruiting.source')}</th>
                <th>{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="cursor-pointer" onClick={() => openDetail(candidate)}>
                  <td className="font-medium">{candidate.name}</td>
                  <td>
                    <span className={`status-badge ${stageBadgeClasses[candidate.stage] || stageBadgeClasses.new}`}>
                      {t(`recruiting.stages.${candidate.stage}`)}
                    </span>
                  </td>
                  <td>{candidate.position_title || '-'}</td>
                  <td>{candidate.owner_name || '-'}</td>
                  <td>{candidate.source || '-'}</td>
                  <td>{candidate.employee_id ? t('recruiting.stages.hired') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 && <div className="p-6 text-sm text-[var(--text-muted)] text-center">{t('common.noData')}</div>}
        </div>
      )}

      {/* Candidate Modal */}
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
              <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.email')}</label>
              <input className="field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('common.phone')}</label>
              <input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.position')}</label>
              <select className="field-select" value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.owner')}</label>
              <select className="field-select" value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.stage')}</label>
              <select className="field-select" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s} value={s}>{t(`recruiting.stages.${s}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.source')}</label>
              <input className="field" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.notes')}</label>
              <textarea className="field-area" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Detail Modal */}
      {detailCandidate && detailData && (
        <ModalShell
          title={`${detailCandidate.name} - ${t('recruiting.detail')}`}
          onClose={() => setDetailCandidate(null)}
          maxWidthClassName="max-w-4xl"
        >
          {detailLoading ? <LoadingState label={t('common.loading')} /> : (
            <div className="space-y-5">
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => { setStageForm({ stage: detailCandidate.stage, reason: '' }); setStageModal(true) }}>
                  {t('recruiting.stageTransition')}
                </button>
                {canHireProposal && detailCandidate.stage === 'evaluation' && (
                  <button type="button" className="btn-primary" onClick={handleHireProposal}>{t('recruiting.hireProposal')}</button>
                )}
                {canConvert && detailCandidate.stage === 'hired' && !detailCandidate.employee_id && (
                  <button type="button" className="btn-primary" onClick={handleConvert}>{t('recruiting.convertToEmployee')}</button>
                )}
                {detailCandidate.employee_id && (
                  <span className="text-sm text-emerald-600">{t('recruiting.stages.hired')} (Employee #{detailCandidate.employee_id})</span>
                )}
                {detailData.overall_score > 0 && (
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{t('recruiting.overallScore')}: {detailData.overall_score}</span>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 border-b border-[var(--border)]">
                {(['profile', 'interviews', 'evaluations', 'offer', 'timeline'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`px-4 py-2 text-sm font-medium ${detailTab === tab ? 'border-b-2 border-[var(--accent)] text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}
                    onClick={() => setDetailTab(tab)}
                  >
                    {t(`recruiting.${tab}`)}
                  </button>
                ))}
              </div>

              {/* Profile Tab */}
              {detailTab === 'profile' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="info-cell"><span className="label">{t('common.name')}</span><span className="value">{detailCandidate.name}</span></div>
                  <div className="info-cell"><span className="label">{t('common.email')}</span><span className="value">{detailCandidate.email || '-'}</span></div>
                  <div className="info-cell"><span className="label">{t('common.phone')}</span><span className="value">{detailCandidate.phone || '-'}</span></div>
                  <div className="info-cell"><span className="label">{t('recruiting.position')}</span><span className="value">{detailCandidate.position_title || '-'}</span></div>
                  <div className="info-cell"><span className="label">{t('recruiting.owner')}</span><span className="value">{detailCandidate.owner_name || '-'}</span></div>
                  <div className="info-cell"><span className="label">{t('recruiting.stage')}</span><span className="value">{t(`recruiting.stages.${detailCandidate.stage}`)}</span></div>
                  <div className="info-cell"><span className="label">{t('recruiting.source')}</span><span className="value">{detailCandidate.source || '-'}</span></div>
                  <div className="info-cell"><span className="label">{t('recruiting.notes')}</span><span className="value">{detailCandidate.notes || '-'}</span></div>
                </div>
              )}

              {/* Interviews Tab */}
              {detailTab === 'interviews' && (
                <div className="space-y-4">
                  {canManageInterviews && (
                    <button type="button" className="btn-primary" onClick={() => { setInterviewForm({ title: '', scheduled_date: '', start_time: '', end_time: '', mode: 'onsite', location: '', interviewer_ids: [] }); setEditingInterviewId(null); setInterviewModal(true) }}>
                      {t('recruiting.addInterview')}
                    </button>
                  )}
                  {detailData.interview_rounds.length === 0 ? <div className="text-sm text-[var(--text-muted)]">{t('common.noData')}</div> : (
                    detailData.interview_rounds.map((r: any) => (
                      <div key={r.id} className="surface-panel p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong>{r.title}</strong>
                          <span className={`status-badge ${stageBadgeClasses[r.status] || ''}`}>{t(`recruiting.${r.status}`)}</span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">{r.scheduled_date} {r.start_time?.slice(11, 16)} - {r.end_time?.slice(11, 16)}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{t(`recruiting.${r.mode}`)} {r.location ? `| ${r.location}` : ''}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{t('recruiting.interviewers')}: {r.interviewers.map((i: any) => i.name).join(', ') || '-'}</div>
                        {r.average_score > 0 && <div className="text-sm font-medium">{t('recruiting.roundAverage')}: {r.average_score}</div>}
                        {canManageInterviews && (
                          <div className="flex gap-2">
                            <button type="button" className="text-sm text-[var(--accent)]" onClick={() => {
                              setInterviewForm({
                                title: r.title,
                                scheduled_date: r.scheduled_date,
                                start_time: r.start_time?.slice(11, 16),
                                end_time: r.end_time?.slice(11, 16),
                                mode: r.mode,
                                location: r.location || '',
                                interviewer_ids: r.interviewers.map((i: any) => i.id),
                              })
                              setEditingInterviewId(r.id)
                              setInterviewModal(true)
                            }}>{t('common.edit')}</button>
                            <button type="button" className="text-sm text-rose-600" onClick={() => {
                              if (window.confirm('Delete this interview round?')) {
                                deleteInterviewRound(r.id).then(() => getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data)))
                              }
                            }}>{t('common.delete')}</button>
                            <button type="button" className="text-sm text-emerald-600" onClick={() => {
                              updateInterviewRoundStatus(r.id, r.status === 'completed' ? 'scheduled' : 'completed').then(() => getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data)))
                            }}>{r.status === 'completed' ? 'Reopen' : 'Complete'}</button>
                          </div>
                        )}
                        {r.status === 'completed' && (
                          <button type="button" className="btn-secondary text-xs" onClick={() => {
                            setEvalRoundId(r.id)
                            setEvalForm({ scores: {}, feedback: '', interviewer_id: currentUserId || 0 })
                            setEvalModal(true)
                          }}>{t('recruiting.submitEvaluation')}</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Evaluations Tab */}
              {detailTab === 'evaluations' && (
                <div className="space-y-4">
                  {detailData.evaluations.length === 0 ? <div className="text-sm text-[var(--text-muted)]">{t('common.noData')}</div> : (
                    detailData.evaluations.map((e: any) => (
                      <div key={e.id} className="surface-panel p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong>{e.interviewer_name}</strong>
                          <span className="text-sm text-[var(--text-muted)]">{e.submitted_at?.slice(0, 16).replace('T', ' ')}</span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">{e.feedback || '-'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Offer Tab */}
              {detailTab === 'offer' && (
                <div className="space-y-4">
                  {canManageOffers && (
                    <button type="button" className="btn-primary" onClick={() => { setOfferForm({ position_id: '', base_salary: '', bonus: '0', proposed_start_date: '', employment_type: 'full_time', work_location: '', notes: '' }); setEditingOfferId(null); setOfferModal(true) }}>
                      {t('recruiting.addOffer')}
                    </button>
                  )}
                  {detailData.offers.length === 0 ? <div className="text-sm text-[var(--text-muted)]">{t('common.noData')}</div> : (
                    detailData.offers.map((o: any) => (
                      <div key={o.id} className="surface-panel p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <strong>{t('recruiting.offerStatus')}: {t(`recruiting.${o.status}`)}</strong>
                          {canManageOffers && (
                            <div className="flex gap-2">
                              <button type="button" className="text-sm text-[var(--accent)]" onClick={() => {
                                setOfferForm({
                                  position_id: String(o.position_id || ''),
                                  base_salary: String(o.base_salary),
                                  bonus: String(o.bonus),
                                  proposed_start_date: o.proposed_start_date || '',
                                  employment_type: o.employment_type,
                                  work_location: o.work_location || '',
                                  notes: o.notes || '',
                                })
                                setEditingOfferId(o.id)
                                setOfferModal(true)
                              }}>{t('common.edit')}</button>
                              {o.status === 'approved' && (
                                <button type="button" className="text-sm text-emerald-600" onClick={() => updateOfferStatus(o.id, { status: 'sent' }).then(() => getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data)))}>Mark Sent</button>
                              )}
                              {o.status === 'sent' && (
                                <>
                                  <button type="button" className="text-sm text-emerald-600" onClick={() => updateOfferStatus(o.id, { status: 'accepted' }).then(() => getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data)))}>Accept</button>
                                  <button type="button" className="text-sm text-rose-600" onClick={() => updateOfferStatus(o.id, { status: 'rejected', reason: 'Candidate rejected' }).then(() => getCandidateDetail(detailCandidate.id).then((data) => setDetailData(data)))}>Reject</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div className="info-cell"><span className="label">{t('recruiting.baseSalary')}</span><span className="value">{o.base_salary}</span></div>
                          <div className="info-cell"><span className="label">{t('recruiting.bonus')}</span><span className="value">{o.bonus}</span></div>
                          <div className="info-cell"><span className="label">{t('recruiting.proposedStartDate')}</span><span className="value">{o.proposed_start_date || '-'}</span></div>
                          <div className="info-cell"><span className="label">{t('recruiting.employmentType')}</span><span className="value">{o.employment_type}</span></div>
                          <div className="info-cell"><span className="label">{t('recruiting.workLocation')}</span><span className="value">{o.work_location || '-'}</span></div>
                          <div className="info-cell"><span className="label">{t('recruiting.position')}</span><span className="value">{o.position_title || '-'}</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Timeline Tab */}
              {detailTab === 'timeline' && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                    <div>
                      <div className="text-sm font-medium">{t('recruiting.stages.new')}</div>
                      <div className="text-xs text-[var(--text-muted)]">{detailCandidate.created_at?.slice(0, 16).replace('T', ' ')}</div>
                    </div>
                  </div>
                  {detailData.interview_rounds.map((r: any) => (
                    <div key={r.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                      <div>
                        <div className="text-sm font-medium">{t('recruiting.addInterview')}: {r.title}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.scheduled_date}</div>
                      </div>
                    </div>
                  ))}
                  {detailData.evaluations.map((e: any) => (
                    <div key={e.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                      <div>
                        <div className="text-sm font-medium">{t('recruiting.submitEvaluation')} - {e.interviewer_name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{e.submitted_at?.slice(0, 16).replace('T', ' ')}</div>
                      </div>
                    </div>
                  ))}
                  {detailData.offers.map((o: any) => (
                    <div key={o.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                      <div>
                        <div className="text-sm font-medium">{t('recruiting.offerStatus')}: {t(`recruiting.${o.status}`)}</div>
                        <div className="text-xs text-[var(--text-muted)]">{o.created_at?.slice(0, 16).replace('T', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModalShell>
      )}

      {/* Stage Transition Modal */}
      {stageModal && detailCandidate && (
        <ModalShell
          title={t('recruiting.stageTransition')}
          onClose={() => setStageModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setStageModal(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" onClick={handleStageUpdate}>{t('common.save')}</button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="field-label">{t('recruiting.stage')}</label>
              <select className="field-select" value={stageForm.stage} onChange={(e) => setStageForm({ ...stageForm, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s} value={s}>{t(`recruiting.stages.${s}`)}</option>)}
              </select>
            </div>
            {(stageForm.stage === 'rejected' || stageForm.stage === 'withdrawn') && (
              <div>
                <label className="field-label">{t('recruiting.rejectionReason')}</label>
                <textarea className="field-area" rows={2} value={stageForm.reason} onChange={(e) => setStageForm({ ...stageForm, reason: e.target.value })} />
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* Interview Modal */}
      {interviewModal && detailCandidate && (
        <ModalShell
          title={editingInterviewId ? t('recruiting.editInterview') : t('recruiting.addInterview')}
          onClose={() => setInterviewModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setInterviewModal(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" onClick={submitInterview}>{t('common.save')}</button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.interviewTitle')}</label>
              <input className="field" value={interviewForm.title} onChange={(e) => setInterviewForm({ ...interviewForm, title: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.scheduledDate')}</label>
              <input className="field" type="date" value={interviewForm.scheduled_date} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_date: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.mode')}</label>
              <select className="field-select" value={interviewForm.mode} onChange={(e) => setInterviewForm({ ...interviewForm, mode: e.target.value })}>
                <option value="onsite">{t('recruiting.onsite')}</option>
                <option value="online">{t('recruiting.online')}</option>
                <option value="phone">{t('recruiting.phone')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.startTime')}</label>
              <input className="field" type="time" value={interviewForm.start_time} onChange={(e) => setInterviewForm({ ...interviewForm, start_time: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.endTime')}</label>
              <input className="field" type="time" value={interviewForm.end_time} onChange={(e) => setInterviewForm({ ...interviewForm, end_time: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.location')}</label>
              <input className="field" value={interviewForm.location} onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.interviewers')}</label>
              <div className="flex flex-wrap gap-2">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={interviewForm.interviewer_ids.includes(emp.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...interviewForm.interviewer_ids, emp.id]
                          : interviewForm.interviewer_ids.filter((id) => id !== emp.id)
                        setInterviewForm({ ...interviewForm, interviewer_ids: ids })
                      }}
                    />
                    {emp.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Evaluation Modal */}
      {evalModal && criteria.length > 0 && (
        <ModalShell
          title={t('recruiting.submitEvaluation')}
          onClose={() => setEvalModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setEvalModal(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" onClick={submitEvaluation}>{t('common.save')}</button>
            </>
          }
        >
          <div className="space-y-4">
            {criteria.map((c) => (
              <div key={c.id}>
                <label className="field-label">{c.name} (1-5)</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={evalForm.scores[c.id] || 3}
                  onChange={(e) => setEvalForm({ ...evalForm, scores: { ...evalForm.scores, [c.id]: Number(e.target.value) } })}
                />
                <div className="text-sm text-[var(--text-muted)]">{evalForm.scores[c.id] || 3}</div>
              </div>
            ))}
            <div>
              <label className="field-label">{t('recruiting.evaluationFeedback')}</label>
              <textarea className="field-area" rows={3} value={evalForm.feedback} onChange={(e) => setEvalForm({ ...evalForm, feedback: e.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}

      {/* Offer Modal */}
      {offerModal && detailCandidate && (
        <ModalShell
          title={editingOfferId ? t('recruiting.editOffer') : t('recruiting.addOffer')}
          onClose={() => setOfferModal(false)}
          footer={
            <>
              <button type="button" className="btn-secondary" onClick={() => setOfferModal(false)}>{t('common.cancel')}</button>
              <button type="button" className="btn-primary" onClick={submitOffer}>{t('common.save')}</button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="field-label">{t('recruiting.position')}</label>
              <select className="field-select" value={offerForm.position_id} onChange={(e) => setOfferForm({ ...offerForm, position_id: e.target.value })}>
                <option value="">{t('common.select')}</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.baseSalary')}</label>
              <input className="field" type="number" value={offerForm.base_salary} onChange={(e) => setOfferForm({ ...offerForm, base_salary: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.bonus')}</label>
              <input className="field" type="number" value={offerForm.bonus} onChange={(e) => setOfferForm({ ...offerForm, bonus: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.proposedStartDate')}</label>
              <input className="field" type="date" value={offerForm.proposed_start_date} onChange={(e) => setOfferForm({ ...offerForm, proposed_start_date: e.target.value })} />
            </div>
            <div>
              <label className="field-label">{t('recruiting.employmentType')}</label>
              <select className="field-select" value={offerForm.employment_type} onChange={(e) => setOfferForm({ ...offerForm, employment_type: e.target.value })}>
                <option value="full_time">{t('employee.full_time')}</option>
                <option value="contractor">{t('employee.contractor')}</option>
                <option value="intern">{t('employee.intern')}</option>
              </select>
            </div>
            <div>
              <label className="field-label">{t('recruiting.workLocation')}</label>
              <input className="field" value={offerForm.work_location} onChange={(e) => setOfferForm({ ...offerForm, work_location: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="field-label">{t('recruiting.notes')}</label>
              <textarea className="field-area" rows={3} value={offerForm.notes} onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })} />
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
