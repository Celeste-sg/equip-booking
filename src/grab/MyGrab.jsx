import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listMyEvents } from './api'
import { effectiveStatus } from './util'
import EventCard from './EventCard'

function Section({ title, events, names, showDate }) {
  if (!events.length) return null
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 pt-2">{title}</h2>
      {events.map(e => <EventCard key={e.id} event={e} names={names} showDate={showDate} />)}
    </section>
  )
}

export default function MyGrab() {
  const { currentUser } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listMyEvents(currentUser.uid).then(setData).catch(() => setError('加载失败，请刷新重试'))
  }, [currentUser.uid])

  const header = (
    <div className="flex items-center gap-2">
      <Link to="/grab" className="text-gray-400 text-xl px-2">‹</Link>
      <h1 className="text-xl font-bold">我的 Grab</h1>
    </div>
  )
  if (error) return <div className="space-y-4">{header}<p className="text-red-500 text-sm">{error}</p></div>
  if (!data) return <div className="space-y-4">{header}<p className="text-gray-400 text-sm">加载中…</p></div>

  const { events, names } = data
  const live = events.filter(e => effectiveStatus(e) !== 'completed')
  const created = live.filter(e => e.creator_id === currentUser.uid)
  const joined = live.filter(e => e.creator_id !== currentUser.uid)
  const history = events.filter(e => effectiveStatus(e) === 'completed')

  return (
    <div className="space-y-4">
      {header}
      {events.length === 0 && <p className="text-gray-400 text-sm text-center py-8">还没有记录</p>}
      <Section title="我发起的" events={created} names={names} />
      <Section title="我参加的" events={joined} names={names} />
      <Section title="历史" events={history} names={names} showDate />
    </div>
  )
}
