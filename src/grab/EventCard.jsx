import { Link } from 'react-router-dom'
import { TYPES, STATUS_LABEL, effectiveStatus, fmtDateTime, fmtTime } from './util'

const BADGE = {
  open: 'bg-green-100 text-green-700',
  closed: 'bg-orange-100 text-orange-700',
  completed: 'bg-gray-100 text-gray-500',
}

export default function EventCard({ event, names, showDate = false, pinned = false }) {
  const t = TYPES[event.type]
  const status = effectiveStatus(event)
  return (
    <Link to={`/grab/event/${event.id}`} className={`block bg-white rounded-2xl p-4 active:bg-gray-50 ${pinned ? 'border-2 border-amber-400 shadow' : 'shadow-sm'}`}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{t.emoji} {event.store_name}</div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${BADGE[status]}`}>{STATUS_LABEL[status]}</span>
      </div>
      <div className="text-sm text-gray-500 mt-1">
        {names[event.creator_id] || '?'} {event.type === 'pickup' ? '帮带' : '发起'}
      </div>
      <div className="flex justify-between text-sm text-gray-600 mt-2">
        <span>{showDate ? fmtDateTime(event.deadline) : `${fmtTime(event.deadline)} 前报名`}</span>
        <span>{event.grab_participants.length} 人参加</span>
      </div>
    </Link>
  )
}
