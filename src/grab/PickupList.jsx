import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveEvents } from './api'
import EventCard from './EventCard'

export default function PickupList() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listActiveEvents().then(setData).catch(() => setError('加载失败，请刷新重试'))
  }, [])

  // The featured organiser's trips first, then the rest by deadline.
  const pickups = data ? data.events.filter(e => e.type === 'pickup') : []
  const featured = (e) => data?.organizerId && e.creator_id === data.organizerId
  const sorted = [...pickups.filter(featured), ...pickups.filter(e => !featured(e))]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/grab" className="text-gray-400 text-xl px-2">‹</Link>
        <h1 className="text-xl font-bold">🙋 我需要帮带</h1>
      </div>
      <p className="text-sm text-gray-500 px-1">选一个行程，先在瑞幸小程序自己下单，再上传取餐二维码。</p>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!data && !error && <p className="text-gray-400 text-sm">加载中…</p>}
      {data && sorted.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-6 text-center text-gray-400 space-y-2">
          <div>暂时没有人去瑞幸</div>
          <Link to="/grab/new/pickup" className="text-amber-600 text-sm">我要去，我来发起 ›</Link>
        </div>
      )}
      {sorted.map(e => <EventCard key={e.id} event={e} names={data.names} pinned={featured(e)} />)}
    </div>
  )
}
