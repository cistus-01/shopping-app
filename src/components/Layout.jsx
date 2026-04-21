import { NavLink } from 'react-router-dom'
import { Home, ShoppingCart, Package, BookOpen, Store } from 'lucide-react'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
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
