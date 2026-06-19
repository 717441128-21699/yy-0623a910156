import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardCheck, AlertTriangle, FileSearch, Shield } from 'lucide-react'

const navItems = [
  { to: '/review', label: '审查列表', icon: ClipboardCheck },
  { to: '/exceptions', label: '异常处理', icon: AlertTriangle },
  { to: '/detail/CR0001', label: '归档详情', icon: FileSearch },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-navy-500">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-navy-400">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">同意书归档审查</h1>
            <p className="text-2xs text-navy-200 mt-0.5">口腔诊所管理系统</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/review'}
              className={({ isActive }) =>
                isActive ? 'sidebar-link-active' : 'sidebar-link'
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-navy-400">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-300 text-xs font-semibold text-white">
              张
            </div>
            <div>
              <p className="text-xs font-medium text-white">张管理</p>
              <p className="text-2xs text-navy-200">病案管理员</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  )
}
