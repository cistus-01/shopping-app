import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useKago } from './hooks/useKago'
import Login from './pages/Login'
import List from './pages/List'
import Cycle from './pages/Cycle'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import Tutorial from './components/Tutorial'

export default function App() {
  const store = useKago()
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (store.loggedIn && !localStorage.getItem('mosoro_tutorial_seen')) {
      setShowTutorial(true)
    }
  }, [store.loggedIn])

  const closeTutorial = () => {
    localStorage.setItem('mosoro_tutorial_seen', '1')
    setShowTutorial(false)
  }

  if (store.loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!store.loggedIn) return <Login onLogin={store.handleLogin} />

  return (
    <Router>
      {showTutorial && <Tutorial onClose={closeTutorial} />}
      <Layout onTutorial={() => setShowTutorial(true)}>
        <Routes>
          <Route path="/" element={<List {...store} />} />
          <Route path="/cycle" element={<Cycle {...store} />} />
          <Route path="/settings" element={
            <Settings
              username={store.username}
              handleLogout={store.handleLogout}
              changePin={store.changePin}
              resetData={store.resetData}
            />
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}
