import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '@/stores/appStore'
import type { Role } from '@/api/index'
import '@/i18n'

interface NavItem {
  path: string
  titleKey: string
  icon: ReactNode
}

const navItems: NavItem[] = [
  {
    path: '/',
    titleKey: 'nav.dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
        <path d="M13.5 17h7" />
        <path d="M17 13.5v7" />
      </svg>
    ),
  },
  {
    path: '/employees',
    titleKey: 'nav.employees',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    ),
  },
  {
    path: '/departments',
    titleKey: 'nav.departments',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 10h.01" />
        <path d="M15 10h.01" />
        <path d="M9 14h.01" />
        <path d="M15 14h.01" />
      </svg>
    ),
  },
  {
    path: '/attendance',
    titleKey: 'nav.attendance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
  {
    path: '/salary',
    titleKey: 'nav.salary',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20" />
        <path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    path: '/approvals',
    titleKey: 'nav.approvals',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
  },
  {
    path: '/recruiting',
    titleKey: 'nav.recruiting',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" />
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <path d="M20 8l2 2-2 2" />
        <path d="M22 10h-4" />
      </svg>
    ),
  },
]

const roles = [
  { value: 'employee', labelZh: '普通员工', labelEn: 'Employee' },
  { value: 'manager', labelZh: '主管', labelEn: 'Manager' },
  { value: 'hr', labelZh: 'HR', labelEn: 'HR' },
]

const pageSubtitleKeys: Record<string, string> = {
  '/': 'dashboard.subtitle',
  '/employees': 'employee.subtitle',
  '/departments': 'department.subtitle',
  '/attendance': 'attendance.subtitle',
  '/salary': 'salary.subtitle',
  '/approvals': 'approval.subtitle',
  '/recruiting': 'recruiting.subtitle',
}

const pageTitleKeys: Record<string, string> = {
  '/': 'dashboard.title',
  '/employees': 'employee.title',
  '/departments': 'department.title',
  '/attendance': 'attendance.title',
  '/salary': 'salary.title',
  '/approvals': 'approval.title',
  '/recruiting': 'recruiting.title',
}

export default function Layout() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { currentRole, setCurrentRole, sidebarCollapsed, toggleSidebar } = useAppStore()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [langDropdownOpen, setLangDropdownOpen] = useState(false)

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const isCollapsed = sidebarCollapsed
  const currentLang = i18n.language
  const isZh = currentLang === 'zh'
  const pageTitleKey = pageTitleKeys[location.pathname] || 'dashboard.title'
  const subtitleKey = pageSubtitleKeys[location.pathname] || 'dashboard.subtitle'

  const isActive = (path: string) => (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path))

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('hrms-lang', lang)
    setLangDropdownOpen(false)
  }

  return (
    <div className="flex min-h-screen text-[var(--text-primary)]">
      <aside
        className="relative hidden shrink-0 flex-col px-4 py-5 text-white md:flex"
        style={{
          width: isCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          background: '#071426',
          transition: 'width 0.22s ease',
        }}
      >
        <div className="relative flex min-h-[56px] items-center gap-3 overflow-hidden rounded-lg border border-white/10 bg-white/5 px-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 3 7.8l9 4.8 9-4.8L12 3Z" fill="white" fillOpacity="0.95" />
              <path d="M4.5 12.8 12 17l7.5-4.2" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
              <path d="M4.5 16.7 12 21l7.5-4.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
            </svg>
          </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="text-[1.05rem] font-semibold text-white">HRMS</div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{isZh ? '人力运营' : 'People Ops'}</div>
              </div>
            )}
        </div>

        <div className="relative mt-8 flex-1">
          {!isCollapsed && (
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              {isZh ? '导航' : 'Workspace'}
            </div>
          )}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.path)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? t(item.titleKey) : undefined}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-3 text-sm font-medium transition-all"
                  aria-current={active ? 'page' : undefined}
                  style={{
                    color: active ? '#ffffff' : 'rgba(203,213,225,0.78)',
                    background: active ? 'rgba(29,78,216,0.28)' : 'transparent',
                    border: active ? '1px solid rgba(87,123,255,0.22)' : '1px solid transparent',
                  }}
                >
                  {active && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-blue-300" />}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/6 text-current transition-colors group-hover:bg-white/10">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="min-w-0">
                      <span className="block truncate">{t(item.titleKey)}</span>
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="relative mt-5 inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-white/6 text-slate-200 transition hover:bg-white/10"
        >
          <svg
            className="h-5 w-5 transition-transform"
            style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-8"
          style={{
            minHeight: 'var(--header-height)',
            background: '#f8fafc',
            borderBottom: '1px solid rgba(21,32,51,0.06)',
          }}
        >
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('common.overview')}</div>
            <div className="text-[1.4rem] font-semibold text-[var(--text-primary)]">{t(pageTitleKey)}</div>
            <div className="hidden text-sm text-[var(--text-secondary)] lg:block">{t(subtitleKey)}</div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button type="button" className="pill" aria-expanded={langDropdownOpen} onClick={() => setLangDropdownOpen((value) => !value)}>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18" />
                  <path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9 15 15 0 0 1-4-9 15 15 0 0 1 4-9Z" />
                </svg>
                <span>{currentLang === 'zh' ? '中文' : 'EN'}</span>
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] min-w-[9rem] rounded-lg border border-[var(--border)] bg-white p-1.5 shadow-[var(--shadow-card)]">
                  {[
                    { code: 'zh', label: '中文' },
                    { code: 'en', label: 'English' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setLanguage(lang.code)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-blue-50 hover:text-[var(--text-primary)]"
                    >
                      {lang.label}
                      {currentLang === lang.code && <span className="text-[var(--accent-strong)]">●</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pill">
              <span className="hidden text-[var(--text-muted)] md:inline">{t('approval.currentRole')}</span>
              <select
                value={currentRole}
                onChange={(event) => setCurrentRole(event.target.value as Role)}
                className="border-0 bg-transparent pr-1 text-sm font-semibold text-[var(--text-primary)] outline-none"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {currentLang === 'zh' ? role.labelZh : role.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden items-center gap-3 rounded-lg border border-[var(--border)] bg-white px-3 py-2 md:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-sm font-semibold text-white">
                {currentRole === 'hr' ? 'HR' : currentRole === 'manager' ? 'MG' : 'EM'}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{t('approval.currentRole')}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {roles.find((role) => role.value === currentRole)?.[currentLang === 'zh' ? 'labelZh' : 'labelEn']}
                </div>
              </div>
            </div>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-white px-4 py-3 md:hidden">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                  active
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-[var(--border)] bg-white text-[var(--text-secondary)]'
                }`}
              >
                {item.icon}
                {t(item.titleKey)}
              </Link>
            )
          })}
        </nav>

        <main className="flex-1 overflow-auto px-4 py-5 md:px-7 md:py-7">
          <div className="page-enter mx-auto w-full max-w-[1460px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
