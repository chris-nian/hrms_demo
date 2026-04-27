import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export type Role = 'employee' | 'manager' | 'hr'
export type ListResponse<T> = { total: number; items: T[]; active_total?: number }

export interface Department {
  id: number
  name: string
  description?: string
  manager_id?: number | null
  manager_name?: string
  headcount_plan: number
  employee_count: number
  created_at: string
}

export interface Position {
  id: number
  title: string
  department_id: number
  department_name: string
  level?: string
  description?: string
  headcount_plan: number
  employee_count: number
  created_at: string
}

export interface Employee {
  id: number
  employee_no?: string
  name: string
  email?: string
  phone?: string
  gender: string
  avatar?: string
  department_id: number | null
  department_name: string
  position_id: number | null
  position_title: string
  manager_id?: number | null
  manager_name?: string
  work_location?: string
  employment_type: string
  contract_end_date?: string
  emergency_contact?: string
  emergency_phone?: string
  hire_date?: string
  status: string
  role: Role
  base_salary?: number | null
  recent_attendance_status?: string
  created_at: string
}

export interface AttendanceRecord {
  id: number
  employee_id: number
  employee_name: string
  date: string
  check_in?: string | null
  check_out?: string | null
  status: string
}

export interface AttendanceStats {
  total_days: number
  normal_days: number
  late_days: number
  absent_days: number
  leave_days: number
  abnormal_days?: number
  rate: number
}

export interface SalaryConfig {
  id: number
  employee_id: number
  base_salary: number
  housing_fund_rate: number
  social_insurance_rate: number
  bonus: number
  deduction: number
}

export interface SalaryResult {
  gross_salary: number
  social_insurance: number
  housing_fund: number
  taxable_income: number
  income_tax: number
  net_salary: number
  details: Array<{ label: string; value: number }>
}

export interface ApprovalRecord {
  id: number
  flow_id: number
  approver_id: number
  approver_name: string
  action: string
  comment?: string
  created_at: string
}

export interface ApprovalItem {
  id: number
  title: string
  type: string
  applicant_id: number
  applicant_name: string
  content: Record<string, unknown> | null
  state: string
  current_approver_id?: number | null
  current_approver_name?: string
  created_at: string
  updated_at: string
  records: ApprovalRecord[]
}

export interface DashboardStats {
  total_employees: number
  active_employees: number
  inactive_employees: number
  attendance_rate: number
  abnormal_attendance_count: number
  pending_approvals: number
  department_count: number
  position_count: number
  contracts_expiring_30: number
  contracts_expiring_60: number
  salary_config_coverage: number
  department_distribution: Array<{ department_id: number; name: string; count: number }>
  recent_approvals: ApprovalItem[]
}

type EmployeePayload = Partial<Omit<Employee, 'id' | 'created_at' | 'department_name' | 'position_title' | 'manager_name'>>
type DepartmentPayload = Pick<Department, 'name'> & Partial<Pick<Department, 'description' | 'manager_id' | 'headcount_plan'>>
type PositionPayload = Pick<Position, 'title' | 'department_id'> & Partial<Pick<Position, 'level' | 'description' | 'headcount_plan'>>
type AttendancePayload = Omit<AttendanceRecord, 'id' | 'employee_name'>

// Departments
export const getDepartments = (): Promise<Department[]> => api.get('/departments').then(r => r.data.items || r.data)
export const createDepartment = (data: DepartmentPayload): Promise<Department> => api.post('/departments', data).then(r => r.data)
export const updateDepartment = (id: number, data: DepartmentPayload): Promise<Department> => api.put(`/departments/${id}`, data).then(r => r.data)
export const deleteDepartment = (id: number): Promise<{ ok: boolean }> => api.delete(`/departments/${id}`).then(r => r.data)

// Positions
export const getPositions = (departmentId?: number): Promise<Position[]> =>
  api.get('/positions', { params: { department_id: departmentId } }).then(r => r.data.items || r.data)
export const createPosition = (data: PositionPayload): Promise<Position> => api.post('/positions', data).then(r => r.data)
export const updatePosition = (id: number, data: PositionPayload): Promise<Position> => api.put(`/positions/${id}`, data).then(r => r.data)
export const deletePosition = (id: number): Promise<{ ok: boolean }> => api.delete(`/positions/${id}`).then(r => r.data)

// Employees
export const getEmployees = (params?: Record<string, unknown>): Promise<ListResponse<Employee>> => api.get('/employees', { params }).then(r => r.data)
export const getEmployee = (id: number): Promise<Employee> => api.get(`/employees/${id}`).then(r => r.data)
export const createEmployee = (data: EmployeePayload): Promise<Employee> => api.post('/employees', data).then(r => r.data)
export const updateEmployee = (id: number, data: EmployeePayload): Promise<Employee> => api.put(`/employees/${id}`, data).then(r => r.data)
export const deleteEmployee = (id: number): Promise<{ ok: boolean; status: string }> => api.delete(`/employees/${id}`).then(r => r.data)

// Attendance
export const getAttendance = (params?: Record<string, unknown>): Promise<ListResponse<AttendanceRecord>> => api.get('/attendance', { params }).then(r => r.data)
export const getAttendanceStats = (month?: string): Promise<AttendanceStats> => api.get('/attendance/stats', { params: { month } }).then(r => r.data)
export const createAttendance = (data: AttendancePayload): Promise<AttendanceRecord> => api.post('/attendance', data).then(r => r.data)
export const updateAttendance = (id: number, data: AttendancePayload): Promise<AttendanceRecord> => api.put(`/attendance/${id}`, data).then(r => r.data)

// Salary
export const getSalaryConfig = (employeeId: number): Promise<SalaryConfig> => api.get(`/salary/config/${employeeId}`).then(r => r.data)
export const updateSalaryConfig = (employeeId: number, data: Omit<SalaryConfig, 'id' | 'employee_id'>): Promise<SalaryConfig> => api.put(`/salary/config/${employeeId}`, data).then(r => r.data)
export const calculateSalary = (data: Omit<SalaryConfig, 'id' | 'employee_id'>): Promise<SalaryResult> => api.post('/salary/calculate', data).then(r => r.data)

// Approvals
export const getApprovals = (params?: Record<string, unknown>): Promise<ListResponse<ApprovalItem>> => api.get('/approvals', { params }).then(r => r.data)
export const getApproval = (id: number): Promise<ApprovalItem> => api.get(`/approvals/${id}`).then(r => r.data)
export const createApproval = (data: { title: string; type: string; applicant_id: number; content?: Record<string, unknown> }): Promise<ApprovalItem> => api.post('/approvals', data).then(r => r.data)
export const approveFlow = (id: number, data: { approver_id: number; comment?: string }): Promise<ApprovalItem> => api.post(`/approvals/${id}/approve`, data).then(r => r.data)
export const rejectFlow = (id: number, data: { approver_id: number; comment?: string }): Promise<ApprovalItem> => api.post(`/approvals/${id}/reject`, data).then(r => r.data)

// Dashboard
export const getDashboardStats = (): Promise<DashboardStats> => api.get('/dashboard/stats').then(r => r.data)

export interface Candidate {
  id: number
  name: string
  email?: string
  phone?: string
  position_id?: number | null
  owner_id?: number | null
  stage: string
  source?: string
  notes?: string
  employee_id?: number | null
  current_stage_entered_at?: string
  rejection_reason?: string
  position_title?: string
  owner_name?: string
  employee_name?: string
  created_at: string
  updated_at: string
}

export type CandidatePayload = Partial<Omit<Candidate, 'id' | 'created_at' | 'updated_at' | 'position_title' | 'owner_name' | 'employee_name'>>

export const getCandidates = (params?: Record<string, unknown>): Promise<ListResponse<Candidate>> => api.get('/candidates', { params }).then(r => r.data)
export const getCandidate = (id: number): Promise<Candidate> => api.get(`/candidates/${id}`).then(r => r.data)
export const createCandidate = (data: CandidatePayload): Promise<Candidate> => api.post('/candidates', data).then(r => r.data)
export const updateCandidate = (id: number, data: CandidatePayload): Promise<Candidate> => api.put(`/candidates/${id}`, data).then(r => r.data)
export const deleteCandidate = (id: number): Promise<{ ok: boolean }> => api.delete(`/candidates/${id}`).then(r => r.data)
export const updateCandidateStage = (id: number, data: { stage: string; reason?: string }): Promise<Candidate> => api.put(`/candidates/${id}/stage`, data).then(r => r.data)
export const convertCandidate = (id: number): Promise<{ ok: boolean; employee_id: number }> => api.post(`/candidates/${id}/convert`).then(r => r.data)
export const getCandidateDetail = (id: number): Promise<{
  candidate: Candidate
  interview_rounds: InterviewRound[]
  evaluations: Evaluation[]
  offers: Offer[]
  overall_score: number
}> => api.get(`/candidates/${id}/detail`).then(r => r.data)

export interface InterviewRound {
  id: number
  candidate_id: number
  title: string
  scheduled_date: string
  start_time: string
  end_time: string
  mode: string
  location?: string
  status: string
  created_at: string
  updated_at: string
  interviewers: Array<{ id: number; name: string }>
  average_score?: number
}

export const getInterviewRounds = (candidateId: number): Promise<ListResponse<InterviewRound>> => api.get(`/interviews/candidate/${candidateId}`).then(r => r.data)
export const createInterviewRound = (candidateId: number, data: Partial<InterviewRound> & { interviewer_ids: number[] }): Promise<InterviewRound> => api.post(`/interviews/candidate/${candidateId}`, data).then(r => r.data)
export const updateInterviewRound = (id: number, data: Partial<InterviewRound> & { interviewer_ids?: number[] }): Promise<InterviewRound> => api.put(`/interviews/${id}`, data).then(r => r.data)
export const deleteInterviewRound = (id: number): Promise<{ ok: boolean }> => api.delete(`/interviews/${id}`).then(r => r.data)
export const updateInterviewRoundStatus = (id: number, status: string): Promise<InterviewRound> => api.put(`/interviews/${id}/status`, null, { params: { status } }).then(r => r.data)
export const getMyInterviews = (employeeId: number): Promise<ListResponse<InterviewRound>> => api.get(`/interviews/my/${employeeId}`).then(r => r.data)

export interface EvaluationCriterion {
  id: number
  name: string
  description?: string
  weight: number
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface EvaluationScore {
  id: number
  evaluation_id: number
  criterion_id: number
  score: number
  criterion_name: string
  weight: number
}

export interface Evaluation {
  id: number
  interview_round_id: number
  interviewer_id: number
  interviewer_name: string
  feedback?: string
  submitted_at: string
  scores: EvaluationScore[]
  weighted_average: number
}

export const getEvaluationCriteria = (): Promise<ListResponse<EvaluationCriterion>> => api.get('/evaluations/criteria').then(r => r.data)
export const createEvaluationCriterion = (data: Partial<EvaluationCriterion>): Promise<EvaluationCriterion> => api.post('/evaluations/criteria', data).then(r => r.data)
export const updateEvaluationCriterion = (id: number, data: Partial<EvaluationCriterion>): Promise<EvaluationCriterion> => api.put(`/evaluations/criteria/${id}`, data).then(r => r.data)
export const deleteEvaluationCriterion = (id: number): Promise<{ ok: boolean }> => api.delete(`/evaluations/criteria/${id}`).then(r => r.data)
export const getEvaluations = (roundId: number): Promise<ListResponse<Evaluation>> => api.get(`/evaluations/round/${roundId}`).then(r => r.data)
export const createEvaluation = (roundId: number, data: { scores: Array<{ criterion_id: number; score: number }>; feedback?: string; interviewer_id: number }): Promise<Evaluation> => api.post(`/evaluations/round/${roundId}`, data).then(r => r.data)

export interface Offer {
  id: number
  candidate_id: number
  position_id?: number | null
  position_title?: string
  base_salary: number
  bonus: number
  proposed_start_date?: string
  employment_type: string
  work_location?: string
  status: string
  sent_at?: string
  responded_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export const getOffers = (candidateId: number): Promise<ListResponse<Offer>> => api.get(`/offers/candidate/${candidateId}`).then(r => r.data)
export const createOffer = (candidateId: number, data: Partial<Offer>): Promise<Offer> => api.post(`/offers/candidate/${candidateId}`, data).then(r => r.data)
export const updateOffer = (id: number, data: Partial<Offer>): Promise<Offer> => api.put(`/offers/${id}`, data).then(r => r.data)
export const updateOfferStatus = (id: number, data: { status: string; reason?: string }): Promise<Offer> => api.put(`/offers/${id}/status`, data).then(r => r.data)
export const deleteOffer = (id: number): Promise<{ ok: boolean }> => api.delete(`/offers/${id}`).then(r => r.data)

export interface RecruitingMetrics {
  total_active_candidates: number
  candidates_by_stage: Record<string, number>
  avg_days_in_stage: number
  upcoming_interviews_count: number
  pending_evaluations_count: number
  pending_hire_proposals_count: number
  offer_acceptance_rate: number
}

export interface DashboardStatsWithRecruiting extends DashboardStats {
  recruiting: RecruitingMetrics
}
