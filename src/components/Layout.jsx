import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, Package, BookOpen, Store, Settings } from 'lucide-react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 right-0 z-30 p-3">
        <NavLink to="/settings" className={({ isActive }) =>
          `w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 shadow-sm border border-gray-100'}`
        }>
          <Settings size={18} />
        </NavLink>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        {children}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-20">
        {[
          { to: '/', icon: Home, label: 'ホーム' },
          { to: '/list', icon: ShoppingCart, label: 'リスト' },
          { to: '/items', icon: Package, label: '定番' },
          { to: '/finance', icon: BookOpen, label: '家計簿' },
          { to: '/stores', icon: Store, label: 'お店' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs transition-colors ${isActive ? 'text-emerald-600' : 'text-gray-400'}`
            }>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
