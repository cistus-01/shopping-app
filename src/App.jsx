import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Items from './pages/Items'
import Finance from './pages/Finance'
import Stores from './pages/Stores'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { useStore } from './hooks/useStore'

export default function App() {
  const store = useStore()

  if (store.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    )
  }

  if (!store.loggedIn) {
    return <Login onLogin={store.handleLogin} />
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home store={store} />} />
          <Route path="/items" element={<Items store={store} />} />
          <Route path="/finance" element={<Finance store={store} />} />
          <Route path="/stores" element={<Stores store={store} />} />
          <Route path="/settings" element={<Settings store={store} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
