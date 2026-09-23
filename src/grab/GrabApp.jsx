import { Link, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GrabAuth from './GrabAuth'
import GrabHome from './GrabHome'
import CreateEvent from './CreateEvent'
import EventDetail from './EventDetail'
import PayPage from './PayPage'
import MyGrab from './MyGrab'
import PickupList from './PickupList'
import Account from './Account'

export default function GrabApp() {
  const { currentUser, userProfile, logout } = useAuth()

  // Same Supabase accounts as instrument booking, with a Grab-styled login/register; we stay on /grab.
  // Not logged in: the landing page is the login page.
  if (!currentUser) return <GrabAuth />

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <Link to="/grab" className="text-xl font-bold text-amber-600">Grab</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/grab/account" className="text-gray-500 truncate max-w-[8rem] py-2 underline decoration-dotted underline-offset-4">{userProfile?.name || currentUser.email} ⚙︎</Link>
          <button onClick={() => logout().catch(() => {})} className="text-gray-400 active:text-red-500 py-2">退出登录</button>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 pb-16">
        <Routes>
          <Route index element={<GrabHome />} />
          <Route path="pickups" element={<PickupList />} />
          <Route path="mine" element={<MyGrab />} />
          <Route path="account" element={<Account />} />
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
