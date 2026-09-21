import { useState } from 'react'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Login from '../pages/Login'
import GrabHome from './GrabHome'
import CreateEvent from './CreateEvent'
import EventDetail from './EventDetail'
import PayPage from './PayPage'
import MyGrab from './MyGrab'

const ACCESS_KEY = 'grab_access'
const ACCESS_PASSWORD = 'grab'

// Lightweight gate only — not real security. Real access control is Supabase login + RLS.
function hasAccess() {
  try { return localStorage.getItem(ACCESS_KEY) === '1' } catch { return false }
}

function Gate({ onPass }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (value.trim() === ACCESS_PASSWORD) {
      try { localStorage.setItem(ACCESS_KEY, '1') } catch { /* ignore */ }
      onPass()
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-3">☕🧋</div>
        <h1 className="text-2xl font-bold mb-6">Grab</h1>
        <input
          type="password"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(false) }}
          placeholder="请输入访问密码"
          autoFocus
          className="w-full border border-gray-300 rounded-2xl px-4 py-3 text-lg text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {error && <p className="text-red-500 text-sm mt-2">密码不对</p>}
        <button type="submit" className="w-full mt-4 bg-amber-500 active:bg-amber-600 text-white text-lg font-semibold rounded-2xl py-3">
          进入
        </button>
      </form>
    </div>
  )
}

export default function GrabApp() {
  const { currentUser } = useAuth()
  const [allowed, setAllowed] = useState(hasAccess)

  if (!allowed) return <Gate onPass={() => setAllowed(true)} />
  // Same Supabase login as instrument booking; after login we stay on /grab.
  if (!currentUser) return <Login />

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="px-4 py-3 max-w-lg mx-auto">
        <Link to="/grab" className="text-xl font-bold text-amber-600">Grab</Link>
      </header>
      <main className="max-w-lg mx-auto px-4 pb-16">
        <Routes>
          <Route index element={<GrabHome />} />
          <Route path="mine" element={<MyGrab />} />
          <Route path="new/:type" element={<CreateEvent />} />
          <Route path="event/:id" element={<EventDetail />} />
          <Route path="event/:id/edit" element={<CreateEvent />} />
          <Route path="event/:id/pay" element={<PayPage />} />
          <Route path="*" element={<Navigate to="/grab" replace />} />
        </Routes>
      </main>
    </div>
  )
}
