import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ShoppingList from './pages/ShoppingList'
import Items from './pages/Items'
import Finance from './pages/Finance'
import Stores from './pages/Stores'
import Settings from './pages/Settings'
import { useStore } from './hooks/useStore'

export default function App() {
  const store = useStore()
  return (
    <BrowserRouter basename="/shopping-app">
      <Layout>
        <Routes>
          <Route path="/" element={<Home store={store} />} />
          <Route path="/list" element={<ShoppingList store={store} />} />
          <Route path="/items" element={<Items store={store} />} />
          <Route path="/finance" element={<Finance store={store} />} />
          <Route path="/stores" element={<Stores store={store} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
