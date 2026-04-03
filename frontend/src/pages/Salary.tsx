import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { calculateSalary, getEmployees, getSalaryConfig } from '@/api/index'
import { EmptyState, LoadingState, PageHeader, Panel, StatCard } from '@/components/ui'

interface EmployeeOption {
  id: number
  name: string
  department_name: string
}

interface SalaryResult {
  gross_salary: number
  social_insurance: number
  housing_fund: number
  taxable_income: number
  income_tax: number
  net_salary: number
}

const PIE_COLORS = ['#577bff', '#3ed3c5', '#f2b646', '#e66a7b']

const formatCurrency = (value: number) =>
  `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Salary() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [baseSalary, setBaseSalary] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [housingFundRate, setHousingFundRate] = useState(7)
  const [socialInsuranceRate, setSocialInsuranceRate] = useState(10.5)
  const [result, setResult] = useState<SalaryResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getEmployees({ page_size: 100 }).then((data) => setEmployees(data.items || []))
  }, [])

  const calculate = useCallback(() => {
    if (!selectedEmployee || !baseSalary) {
      setResult(null)
      return
    }

    setLoading(true)
    calculateSalary({
      employee_id: Number(selectedEmployee),
      base_salary: baseSalary,
      bonus,
      deduction,
      housing_fund_rate: housingFundRate / 100,
      social_insurance_rate: socialInsuranceRate / 100,
    })
      .then((data) => setResult(data))
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [baseSalary, bonus, deduction, housingFundRate, selectedEmployee, socialInsuranceRate])

  useEffect(() => {
    const timer = window.setTimeout(calculate, 250)
    return () => window.clearTimeout(timer)
  }, [calculate])

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    if (!employeeId) {
      setBaseSalary(0)
      setResult(null)
      return
    }

    getSalaryConfig(Number(employeeId)).then((config) => {
      setBaseSalary(config.base_salary || 0)
      setBonus(config.bonus || 0)
      setDeduction(config.deduction || 0)
      setHousingFundRate((config.housing_fund_rate || 0.07) * 100)
      setSocialInsuranceRate((config.social_insurance_rate || 0.105) * 100)
    })
  }

  const pieData = useMemo(
    () =>
      result
        ? [
            { name: t('salary.netSalary'), value: Math.max(result.net_salary, 0) },
            { name: t('salary.incomeTax'), value: Math.max(result.income_tax, 0) },
            { name: t('salary.socialInsurance'), value: Math.max(result.social_insurance, 0) },
            { name: t('salary.housingFund'), value: Math.max(result.housing_fund, 0) },
          ].filter((item) => item.value > 0)
        : [],
    [result, t],
  )

  const selectedEmployeeName = employees.find((employee) => String(employee.id) === selectedEmployee)?.name

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={isZh ? '薪酬试算' : 'Compensation'}
        title={t('salary.title')}
        description={t('salary.subtitle')}
        actions={
          <button type="button" className="btn-secondary" disabled={!result} onClick={() => window.print()}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V4h12v5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 14h12v6H6z" />
            </svg>
            {t('salary.export')}
          </button>
        }
        meta={selectedEmployeeName ? <div className="meta-chip">{selectedEmployeeName}</div> : undefined}
      />

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Panel title={isZh ? '输入区' : 'Inputs'} description={isZh ? '输入控件统一成单列工作区，字段高度、标签间距和阅读节奏都更稳定。' : 'Controls now live in a single calm column with consistent labels, field heights, and breathing room.'}>
          <div className="space-y-5">
            <div>
              <label className="field-label">{t('salary.selectEmployee')}</label>
              <select className="field-select" value={selectedEmployee} onChange={(event) => handleEmployeeChange(event.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}{employee.department_name ? ` (${employee.department_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="field-label">{t('salary.baseSalary')}</label>
                <input className="field" type="number" value={baseSalary || ''} onChange={(event) => setBaseSalary(Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">{t('salary.bonus')}</label>
                <input className="field" type="number" value={bonus || ''} onChange={(event) => setBonus(Number(event.target.value) || 0)} />
              </div>
            </div>

            <div>
              <label className="field-label">{t('salary.deduction')}</label>
              <input className="field" type="number" value={deduction || ''} onChange={(event) => setDeduction(Number(event.target.value) || 0)} />
            </div>

            <div className="space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <div className="flex items-center justify-between">
                <span className="field-label !mb-0">{t('salary.housingFundRate')}</span>
                <strong className="text-lg text-[var(--accent-strong)]">{housingFundRate}%</strong>
              </div>
              <input type="range" min="5" max="12" step="0.5" value={housingFundRate} onChange={(event) => setHousingFundRate(Number(event.target.value))} />
            </div>

            <div className="space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <div className="flex items-center justify-between">
                <span className="field-label !mb-0">{t('salary.socialInsuranceRate')}</span>
                <strong className="text-lg text-[var(--accent-strong)]">{socialInsuranceRate}%</strong>
              </div>
              <input type="range" min="8" max="12" step="0.5" value={socialInsuranceRate} onChange={(event) => setSocialInsuranceRate(Number(event.target.value))} />
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          {loading ? (
            <LoadingState label={isZh ? '计算中...' : 'Calculating...'} />
          ) : !result ? (
            <Panel title={isZh ? '结果预览' : 'Preview'} description={isZh ? '选择员工并填写参数后，这里会实时生成更清晰的薪酬结果。' : 'Choose an employee and set salary inputs to generate a live compensation breakdown.'}>
              <EmptyState
                title={t('salary.selectEmployee')}
                description={isZh ? '重新设计后的结果区域为实发工资、明细和图表都留出了足够空间。' : 'The redesigned result area leaves plenty of room for the final amount, breakdown, and chart.'}
                icon={
                  <svg className="h-16 w-16 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12v18H6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 8h6M9 12h6M9 16h3" />
                  </svg>
                }
              />
            </Panel>
          ) : (
            <>
              <section className="surface-panel relative overflow-hidden p-7 text-white">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#142140,#577bff_56%,#3ed3c5)]" />
                <div className="absolute -right-10 top-0 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-12 left-0 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="relative space-y-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{t('salary.netSalary')}</div>
                  <div className="text-[clamp(2.6rem,5vw,4.4rem)] font-semibold tracking-[-0.06em]">{formatCurrency(result.net_salary)}</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[20px] border border-white/15 bg-white/10 p-4">
                      <div className="text-sm text-white/70">{t('salary.grossSalary')}</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(result.gross_salary)}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/15 bg-white/10 p-4">
                      <div className="text-sm text-white/70">{t('salary.incomeTax')}</div>
                      <div className="mt-1 text-xl font-semibold">-{formatCurrency(result.income_tax)}</div>
                    </div>
                    <div className="rounded-[20px] border border-white/15 bg-white/10 p-4">
                      <div className="text-sm text-white/70">{t('salary.taxableIncome')}</div>
                      <div className="mt-1 text-xl font-semibold">{formatCurrency(result.taxable_income)}</div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <Panel title={t('salary.salaryBreakdown')} description={isZh ? '明细区域改成更像财务摘要卡片的结构，而不是一排排拥挤的小行。' : 'The itemized list now reads like financial summary cards rather than stacked utility rows.'}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-white/75 px-4 py-4">
                      <span className="text-[var(--text-secondary)]">{t('salary.grossSalary')}</span>
                      <strong className="text-[var(--text-primary)]">{formatCurrency(result.gross_salary)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-white/75 px-4 py-4">
                      <span className="text-[var(--text-secondary)]">{t('salary.socialInsurance')}</span>
                      <strong className="text-rose-600">-{formatCurrency(result.social_insurance)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-white/75 px-4 py-4">
                      <span className="text-[var(--text-secondary)]">{t('salary.housingFund')}</span>
                      <strong className="text-rose-600">-{formatCurrency(result.housing_fund)}</strong>
                    </div>
                    <div className="flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-white/75 px-4 py-4">
                      <span className="text-[var(--text-secondary)]">{t('salary.incomeTax')}</span>
                      <strong className="text-rose-600">-{formatCurrency(result.income_tax)}</strong>
                    </div>
                  </div>
                </Panel>

                <Panel title={isZh ? '构成图' : 'Composition'} description={isZh ? '图表尺寸和图例排布也重新整理过，演示时更容易讲清楚收入拆分。' : 'A larger chart and cleaner legend make the salary split easier to explain during demos.'}>
                  <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" innerRadius={62} outerRadius={95} paddingAngle={3}>
                            {pieData.map((item, index) => (
                              <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {pieData.map((item, index) => (
                        <div key={item.name} className="rounded-[20px] border border-[var(--border)] bg-white/75 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                            <span className="text-sm font-medium text-[var(--text-primary)]">{item.name}</span>
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)]">{formatCurrency(item.value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
              </section>
            </>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label={t('salary.baseSalary')} value={formatCurrency(baseSalary)} hint="Editable input" tone="blue" />
            <StatCard label={t('salary.bonus')} value={formatCurrency(bonus)} hint="Additional income" tone="green" />
            <StatCard label={t('salary.deduction')} value={formatCurrency(deduction)} hint="Manual deduction" tone="rose" />
          </section>
        </div>
      </div>
    </div>
  )
}
