import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveEvents } from './api'
import EventCard from './EventCard'

export default function GrabHome() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listActiveEvents().then(setData).catch(() => setError('加载失败，请刷新重试'))
  }, [])

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

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold text-gray-500">进行中</h2>
        <Link to="/grab/mine" className="text-sm text-amber-600">我的 Grab ›</Link>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!data && !error && <p className="text-gray-400 text-sm">加载中…</p>}
      {data && data.events.length === 0 && <p className="text-gray-400 text-sm text-center py-8">还没有人发起，你来第一个吧</p>}
      {data && data.events.map(e => <EventCard key={e.id} event={e} names={data.names} />)}
    </div>
  )
}
