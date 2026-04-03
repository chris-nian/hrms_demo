import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Departments
export const getDepartments = () => api.get('/departments').then(r => r.data)
export const createDepartment = (data: any) => api.post('/departments', data).then(r => r.data)
export const updateDepartment = (id: number, data: any) => api.put(`/departments/${id}`, data).then(r => r.data)
export const deleteDepartment = (id: number) => api.delete(`/departments/${id}`).then(r => r.data)

// Positions
export const getPositions = (departmentId?: number) =>
  api.get('/positions', { params: { department_id: departmentId } }).then(r => r.data)
export const createPosition = (data: any) => api.post('/positions', data).then(r => r.data)
export const updatePosition = (id: number, data: any) => api.put(`/positions/${id}`, data).then(r => r.data)
export const deletePosition = (id: number) => api.delete(`/positions/${id}`).then(r => r.data)

// Employees
export const getEmployees = (params?: any) => api.get('/employees', { params }).then(r => r.data)
export const getEmployee = (id: number) => api.get(`/employees/${id}`).then(r => r.data)
export const createEmployee = (data: any) => api.post('/employees', data).then(r => r.data)
export const updateEmployee = (id: number, data: any) => api.put(`/employees/${id}`, data).then(r => r.data)
export const deleteEmployee = (id: number) => api.delete(`/employees/${id}`).then(r => r.data)

// Attendance
export const getAttendance = (params?: any) => api.get('/attendance', { params }).then(r => r.data)
export const getAttendanceStats = (month?: string) => api.get('/attendance/stats', { params: { month } }).then(r => r.data)

// Salary
export const getSalaryConfig = (employeeId: number) => api.get(`/salary/config/${employeeId}`).then(r => r.data)
export const updateSalaryConfig = (employeeId: number, data: any) => api.put(`/salary/config/${employeeId}`, data).then(r => r.data)
export const calculateSalary = (data: any) => api.post('/salary/calculate', data).then(r => r.data)

// Approvals
export const getApprovals = (params?: any) => api.get('/approvals', { params }).then(r => r.data)
export const getApproval = (id: number) => api.get(`/approvals/${id}`).then(r => r.data)
export const createApproval = (data: any) => api.post('/approvals', data).then(r => r.data)
export const approveFlow = (id: number, data: any) => api.post(`/approvals/${id}/approve`, data).then(r => r.data)
export const rejectFlow = (id: number, data: any) => api.post(`/approvals/${id}/reject`, data).then(r => r.data)

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data)
