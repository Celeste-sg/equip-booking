import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useUserActivity from './useUserActivity'
import { setSignupApp } from './api'

// Only users who registered on Grab; instrument-booking users are on the booking admin page.
export default function GrabAdmin() {
  const { isAdmin } = useAuth()
  const { byApp, grabError } = useUserActivity()
  if (!isAdmin) return <Navigate to="/grab" replace />

  const mine = byApp('grab').sort((a, b) => b.nGrab - a.nGrab)
  const unassigned = byApp(null)
  const bookingCount = byApp('booking').length
  const move = (u, app) => setSignupApp(u.id, app).catch(err => alert(`失败：${err.message}`))

  const card = (u, actions) => (
    <div key={u.id} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{u.name || u.email}</span>
          {u.role === 'admin' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">管理员</span>}
        </div>
        <div className="text-xs text-gray-400 truncate">{u.email}</div>
        <div className="text-xs text-gray-500 mt-1">
          发起 {u.grabCreated} · 参与 {u.grabJoined}{u.nBooking > 0 && ` · 也用仪器预约 (${u.nBooking})`}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">{actions}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">管理 · Grab 用户</h1>
      {grabError && <p className="text-sm text-red-500">Grab 记录加载失败：{grabError}</p>}

      <section className="space-y-2">
        <h2 className="font-semibold text-gray-600">🧋 在 Grab 注册的用户 <span className="text-gray-400 font-normal">{mine.length}</span></h2>
        {mine.map(u => card(u,
          <button onClick={() => { if (confirm(`把 ${u.name} 移到仪器预约用户？`)) move(u, 'booking') }}
            className="text-xs text-gray-400 py-1">移到仪器预约</button>
        ))}
        {mine.length === 0 && <p className="text-center text-gray-400 text-sm py-8">还没有用户</p>}
      </section>

      {unassigned.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold text-gray-600">未分类 <span className="text-gray-400 font-normal">{unassigned.length}</span></h2>
          <p className="text-xs text-gray-500">不确定在哪边注册的，请选择归属。</p>
          {unassigned.map(u => card(u, <>
            <button onClick={() => move(u, 'grab')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">🧋 Grab</button>
            <button onClick={() => move(u, 'booking')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">🔬 仪器预约</button>
          </>))}
        </section>
      )}

      <p className="text-xs text-gray-400">另有 {bookingCount} 位在仪器预约注册的用户，在仪器预约的 Admin 页面查看。</p>
    </div>
  )
}
