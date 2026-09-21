import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveEvents } from './api'
import EventCard from './EventCard'

function Choice({ to, emoji, title, hint, className }) {
  return (
    <Link to={to} className={`flex items-center gap-4 rounded-3xl p-5 active:opacity-90 ${className}`}>
      <div className="text-4xl">{emoji}</div>
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="text-sm opacity-80 mt-0.5">{hint}</div>
      </div>
    </Link>
  )
}

export default function GrabHome() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listActiveEvents().then(setData).catch(() => setError('加载失败，请刷新重试'))
  }, [])

  const pickups = data ? data.events.filter(e => e.type === 'pickup') : []
  const groupOrders = data ? data.events.filter(e => e.type === 'group_order') : []

  return (
    <div className="space-y-4">
      <h1 className="text-lg text-gray-500 px-1">你想做什么？</h1>

      <Choice to="/grab/pickups" emoji="🙋" title="我需要帮带"
        hint={!data ? '看看谁在去瑞幸' : pickups.length ? `${pickups.length} 个帮带行程进行中` : '暂时没有人去瑞幸'}
        className="bg-amber-500 text-white shadow" />
      <Choice to="/grab/new/pickup" emoji="☕" title="我要发起帮带" hint="我去瑞幸，可以帮大家带"
        className="bg-white text-gray-800 border-2 border-amber-400" />
      <Choice to="/grab/new/group_order" emoji="🧋" title="我要发起外卖拼单" hint="淘宝闪购 / 美团外卖 / 京东外卖，找人一起点"
        className="bg-white text-gray-800 border-2 border-pink-400" />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center justify-between pt-3">
        <h2 className="text-sm font-semibold text-gray-500">🧋 正在拼单，可以加入</h2>
        <Link to="/grab/mine" className="text-sm text-amber-600">我的 Grab ›</Link>
      </div>
      {!data && !error && <p className="text-gray-400 text-sm">加载中…</p>}
      {data && groupOrders.length === 0 && <p className="text-gray-400 text-sm text-center py-4">现在没有拼单</p>}
      {groupOrders.map(e => <EventCard key={e.id} event={e} names={data.names} />)}
    </div>
  )
}
