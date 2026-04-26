import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import {
  calculateSalary,
  getEmployees,
  getSalaryConfig,
  updateSalaryConfig,
  type Employee,
  type SalaryResult,
} from '@/api/index'
import { EmptyState, LoadingState, PageHeader, Panel, StatCard } from '@/components/ui'

const PIE_COLORS = ['#1d4ed8', '#059669', '#d97706', '#dc2626']

const formatCurrency = (value: number) =>
  `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function Salary() {
  const { t, i18n } = useTranslation()
  const isZh = i18n.language === 'zh'
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [baseSalary, setBaseSalary] = useState(0)
  const [bonus, setBonus] = useState(0)
  const [deduction, setDeduction] = useState(0)
  const [housingFundRate, setHousingFundRate] = useState(12)
  const [socialInsuranceRate, setSocialInsuranceRate] = useState(10.5)
  const [result, setResult] = useState<SalaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)

  useEffect(() => {
    getEmployees({ page_size: 100, status: 'active' }).then((data) => setEmployees(data.items || []))
  }, [])

  const payload = useMemo(() => ({
    base_salary: baseSalary,
    bonus,
    deduction,
    housing_fund_rate: housingFundRate / 100,
    social_insurance_rate: socialInsuranceRate / 100,
  }), [baseSalary, bonus, deduction, housingFundRate, socialInsuranceRate])

  const calculate = useCallback(() => {
    if (!selectedEmployee || !baseSalary) {
      setResult(null)
      return
    }
    setLoading(true)
    calculateSalary(payload)
      .then((data) => setResult(data))
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [baseSalary, payload, selectedEmployee])

  useEffect(() => {
    const timer = window.setTimeout(calculate, 250)
    return () => window.clearTimeout(timer)
  }, [calculate])

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId)
    setResult(null)
    if (!employeeId) return
    setConfigLoading(true)
    getSalaryConfig(Number(employeeId)).then((config) => {
      setBaseSalary(config.base_salary || 0)
      setBonus(config.bonus || 0)
      setDeduction(config.deduction || 0)
      setHousingFundRate((config.housing_fund_rate || 0.12) * 100)
      setSocialInsuranceRate((config.social_insurance_rate || 0.105) * 100)
    }).finally(() => setConfigLoading(false))
  }

  const saveConfig = () => {
    if (!selectedEmployee) return
    setSaving(true)
    updateSalaryConfig(Number(selectedEmployee), payload)
      .then(() => alert(t('common.success')))
      .catch(() => alert(t('common.error')))
      .finally(() => setSaving(false))
  }

  const pieData = useMemo(() =>
    result
      ? [
          { name: t('salary.netSalary'), value: Math.max(result.net_salary, 0) },
          { name: t('salary.socialInsurance'), value: Math.max(result.social_insurance, 0) },
          { name: t('salary.housingFund'), value: Math.max(result.housing_fund, 0) },
          { name: t('salary.incomeTax'), value: Math.max(result.income_tax, 0) },
        ].filter((item) => item.value > 0)
      : [],
    [result, t],
  )

  const selected = employees.find((employee) => String(employee.id) === selectedEmployee)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={isZh ? '薪酬台账' : 'Compensation'}
        title={t('salary.title')}
        description={t('salary.subtitle')}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" disabled={!result} onClick={() => window.print()}>{t('salary.export')}</button>
            <button type="button" className="btn-primary" disabled={!selectedEmployee || saving || configLoading} onClick={saveConfig}>{saving ? '...' : t('salary.saveConfig')}</button>
          </div>
        }
        meta={selected ? <div className="meta-chip">{selected.name} · {selected.department_name}</div> : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title={t('salary.configPanel')} description={t('salary.configDescription')}>
          <div className="space-y-5">
            <div>
              <label className="field-label">{t('salary.selectEmployee')}</label>
              <select className="field-select" value={selectedEmployee} onChange={(event) => handleEmployeeChange(event.target.value)}>
                <option value="">{t('common.select')}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.employee_no} · {employee.name} ({employee.department_name})</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">{t('salary.baseSalary')}</label>
                <input className="field" type="number" min="0" value={baseSalary || ''} onChange={(event) => setBaseSalary(Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">{t('salary.bonus')}</label>
                <input className="field" type="number" min="0" value={bonus || ''} onChange={(event) => setBonus(Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">{t('salary.deduction')}</label>
                <input className="field" type="number" min="0" value={deduction || ''} onChange={(event) => setDeduction(Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">{t('salary.socialInsuranceRate')}</label>
                <input className="field" type="number" min="0" max="30" step="0.5" value={socialInsuranceRate} onChange={(event) => setSocialInsuranceRate(Number(event.target.value) || 0)} />
              </div>
              <div>
                <label className="field-label">{t('salary.housingFundRate')}</label>
                <input className="field" type="number" min="0" max="30" step="0.5" value={housingFundRate} onChange={(event) => setHousingFundRate(Number(event.target.value) || 0)} />
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          {loading ? <LoadingState label={isZh ? '计算中...' : 'Calculating...'} /> : !result ? (
            <Panel title={t('salary.preview')} description={t('salary.previewDescription')}>
              <EmptyState title={t('salary.selectEmployee')} description={t('salary.empty')} />
            </Panel>
          ) : (
            <>
              <section className="surface-panel p-6">
                <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-muted)]">{t('salary.netSalary')}</div>
                    <div className="mt-2 text-4xl font-semibold text-[var(--text-primary)]">{formatCurrency(result.net_salary)}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="info-cell"><span>{t('salary.grossSalary')}</span><strong>{formatCurrency(result.gross_salary)}</strong></div>
                      <div className="info-cell"><span>{t('salary.taxableIncome')}</span><strong>{formatCurrency(result.taxable_income)}</strong></div>
                    </div>
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" innerRadius={58} outerRadius={88} paddingAngle={2}>
                          {pieData.map((item, index) => <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>

              <Panel title={t('salary.salaryBreakdown')} description={t('salary.breakdownDescription')}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="info-cell"><span>{t('salary.grossSalary')}</span><strong>{formatCurrency(result.gross_salary)}</strong></div>
                  <div className="info-cell"><span>{t('salary.socialInsurance')}</span><strong className="text-rose-600">-{formatCurrency(result.social_insurance)}</strong></div>
                  <div className="info-cell"><span>{t('salary.housingFund')}</span><strong className="text-rose-600">-{formatCurrency(result.housing_fund)}</strong></div>
                  <div className="info-cell"><span>{t('salary.incomeTax')}</span><strong className="text-rose-600">-{formatCurrency(result.income_tax)}</strong></div>
                  <div className="info-cell md:col-span-2"><span>{t('salary.netSalary')}</span><strong>{formatCurrency(result.net_salary)}</strong></div>
                </div>
              </Panel>
            </>
          )}

          <section className="grid gap-4 md:grid-cols-3">
            <StatCard label={t('salary.baseSalary')} value={formatCurrency(baseSalary)} hint={t('salary.configValue')} tone="blue" />
            <StatCard label={t('salary.bonus')} value={formatCurrency(bonus)} hint={t('salary.configValue')} tone="green" />
            <StatCard label={t('salary.deduction')} value={formatCurrency(deduction)} hint={t('salary.configValue')} tone="rose" />
          </section>
        </div>
      </div>
    </div>
  )
}
