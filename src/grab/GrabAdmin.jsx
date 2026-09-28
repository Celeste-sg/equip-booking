import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import useUserActivity from './useUserActivity'

const FILTERS = [['all', '全部'], ['grab', '只用 Grab'], ['both', '两个都用'], ['booking', '只用仪器预约'], ['none', '还没用过']]

// All registered users (shared with instrument booking), with their Grab activity.
export default function GrabAdmin() {
  const { isAdmin } = useAuth()
  const { rows, grabError } = useUserActivity()
  const [filter, setFilter] = useState('all')
  if (!isAdmin) return <Navigate to="/grab" replace />

  const counts = Object.fromEntries(FILTERS.map(([k]) => [k, k === 'all' ? rows.length : rows.filter(r => r.kind === k).length]))
  const shown = (filter === 'all' ? rows : rows.filter(r => r.kind === filter))
    .sort((a, b) => b.nGrab - a.nGrab || (a.name || '').localeCompare(b.name || ''))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">管理 · 所有用户</h1>
      <p className="text-sm text-gray-500">Grab 和仪器预约共用一套账号，这里列出所有注册用户。</p>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`text-sm px-3 py-1.5 rounded-full ${filter === k ? 'bg-amber-500 text-white font-medium' : 'bg-white text-gray-600'}`}>
            {label} <span className="opacity-70">{counts[k]}</span>
          </button>
        ))}
      </div>
      {grabError && <p className="text-sm text-red-500">Grab 记录加载失败：{grabError}</p>}

      <div className="space-y-2">
        {shown.map(u => (
          <div key={u.id} className="bg-white rounded-2xl shadow-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{u.name || u.email}</span>
              {u.role === 'admin' && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">管理员</span>}
            </div>
            <div className="text-xs text-gray-400 truncate">{u.email}</div>
            <div className="flex flex-wrap gap-1.5 mt-2 text-xs">
              {u.nGrab > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🧋 发起 {u.grabCreated} · 参与 {u.grabJoined}</span>
              )}
              {u.nBooking > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🔬 仪器预约 {u.nBooking}</span>
              )}
              {u.kind === 'none' && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">还没用过</span>}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-center text-gray-400 text-sm py-8">没有用户</p>}
      </div>
    </div>
  )
}
