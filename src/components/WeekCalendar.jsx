import { useState } from 'react'
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks,
  subWeeks, isToday, isSameDay, parseISO, isWithinInterval,
} from 'date-fns'

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8) // 8am–8pm

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const SLOT_HEIGHT = 48 // px per hour

export default function WeekCalendar({ bookings, onSlotClick, onBookingClick, equipment }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })

  function bookingsForDay(day) {
    const dateStr = format(day, 'yyyy-MM-dd')
    return bookings.filter((b) => b.date === dateStr && b.status !== 'cancelled')
  }

  function bookingStyle(booking) {
    const start = timeToMinutes(booking.startTime) - 8 * 60
    const end = timeToMinutes(booking.endTime) - 8 * 60
    const top = (start / 60) * SLOT_HEIGHT
    const height = ((end - start) / 60) * SLOT_HEIGHT
    return { top, height: Math.max(height, 20) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <button
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-gray-700">
          {format(weekStart, 'MMM d')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MMM d, yyyy')}
        </span>
        <button
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
        >
          ›
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-gray-100">
            <div className="py-2" /> {/* time gutter */}
            {days.map((day) => (
              <div
                key={day.toString()}
                className={`py-2 text-center text-xs font-medium border-l border-gray-100 ${
                  isToday(day) ? 'text-blue-600 bg-blue-50' : 'text-gray-500'
                }`}
              >
                <div>{format(day, 'EEE')}</div>
                <div className={`text-base font-bold mt-0.5 ${isToday(day) ? 'text-blue-600' : 'text-gray-800'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="relative grid grid-cols-8">
            {/* Hour labels */}
            <div className="flex flex-col">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="text-right pr-2 text-xs text-gray-400 border-b border-gray-50"
                  style={{ height: SLOT_HEIGHT }}
                >
                  <span className="relative -top-2">{h}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => (
              <div
                key={day.toString()}
                className={`relative border-l border-gray-100 ${isToday(day) ? 'bg-blue-50/30' : ''}`}
                style={{ height: HOURS.length * SLOT_HEIGHT }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) onSlotClick?.(day)
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute w-full border-b border-gray-100 cursor-pointer hover:bg-blue-50/50 transition-colors"
                    style={{ top: (h - 8) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                    onClick={() => onSlotClick?.(day)}
                  />
                ))}

                {/* Bookings */}
                {bookingsForDay(day).map((b) => {
                  const style = bookingStyle(b)
                  return (
                    <div
                      key={b.id}
                      className="absolute left-0.5 right-0.5 bg-blue-500 text-white text-xs rounded px-1.5 py-1 overflow-hidden cursor-pointer hover:bg-blue-600 transition-colors z-10 shadow-sm"
                      style={{ top: style.top, height: style.height }}
                      onClick={(e) => { e.stopPropagation(); onBookingClick?.(b) }}
                    >
                      <div className="font-medium truncate">{b.userName}</div>
                      {style.height > 35 && (
                        <div className="opacity-80 truncate">{b.startTime}–{b.endTime}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
