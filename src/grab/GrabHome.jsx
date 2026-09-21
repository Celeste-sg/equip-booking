import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listActiveEvents } from './api'
import EventCard from './EventCard'

export default function GrabHome() {
  const { currentUser } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listActiveEvents().then(setData).catch(() => setError('加载失败，请刷新重试'))
  }, [])

  // The featured organiser's pickup trips are pinned at the top; the rest follow by deadline.
  const isFeatured = (e) => e.type === 'pickup' && data?.organizerId && e.creator_id === data.organizerId
  const pinned = data ? data.events.filter(isFeatured) : []
  const others = data ? data.events.filter(e => !isFeatured(e)) : []
  const viewerIsOrganizer = data?.organizerId === currentUser.uid

  return (
    <div className="space-y-4">
      <Link to="/grab/new/pickup" className="block bg-amber-500 active:bg-amber-600 text-white rounded-3xl p-5 shadow">
        <div className="text-xl font-bold">☕ 我要去瑞幸</div>
        <div className="text-sm opacity-90 mt-1">可以帮带</div>
      </Link>
      <Link to="/grab/new/group_order" className="block bg-pink-500 active:bg-pink-600 text-white rounded-3xl p-5 shadow">
        <div className="text-xl font-bold">🧋 一起点外卖</div>
        <div className="text-sm opacity-90 mt-1">我们一起点</div>
      </Link>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!data && !error && <p className="text-gray-400 text-sm">加载中…</p>}

      {data && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 pt-2">☕ 瑞幸帮带</h2>
          {pinned.map(e => <EventCard key={e.id} event={e} names={data.names} pinned />)}
          {pinned.length === 0 && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-4 text-center text-gray-400">
              <div>暂时没有帮带行程</div>
              {viewerIsOrganizer && <Link to="/grab/new/pickup" className="text-amber-600 text-sm">去发起一个 ›</Link>}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-semibold text-gray-500">进行中</h2>
            <Link to="/grab/mine" className="text-sm text-amber-600">我的 Grab ›</Link>
          </div>
          {others.length === 0 && <p className="text-gray-400 text-sm text-center py-6">还没有其他活动</p>}
          {others.map(e => <EventCard key={e.id} event={e} names={data.names} />)}
        </>
      )}
    </div>
  )
}
