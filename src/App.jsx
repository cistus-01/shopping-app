import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import ShoppingList from './pages/ShoppingList'
import Items from './pages/Items'
import Finance from './pages/Finance'
import { useStore } from './hooks/useStore'

export default function App() {
  const store = useStore()
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home store={store} />} />
          <Route path="/list" element={<ShoppingList store={store} />} />
          <Route path="/items" element={<Items store={store} />} />
          <Route path="/finance" element={<Finance store={store} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
