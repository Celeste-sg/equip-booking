import { useState } from 'react'
import { ref, push, set, query, orderByChild, equalTo, get } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { format, parseISO, isAfter, isBefore, areIntervalsOverlapping } from 'date-fns'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

export default function BookingModal({ equipment, selectedDate, onClose, onSuccess }) {
  const { currentUser, userProfile } = useAuth()
  const [date, setDate] = useState(
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  )
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function checkConflict(start, end) {
    const q = query(ref(db, 'bookings'), orderByChild('equipmentId'), equalTo(equipment.id))
    const snap = await get(q)
    if (!snap.exists()) return { conflict: false }
    for (const child of Object.values(snap.val())) {
      if (child.date !== date || child.status === 'cancelled') continue
      const overlap = areIntervalsOverlapping(
        { start, end },
        { start: parseISO(`${date}T${child.startTime}`), end: parseISO(`${date}T${child.endTime}`) }
      )
      if (overlap) return { conflict: true, booking: child }
    }
    return { conflict: false }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const start = parseISO(`${date}T${startTime}`)
    const end = parseISO(`${date}T${endTime}`)

    if (!isAfter(end, start)) return setError('End time must be after start time.')
    if (isBefore(start, new Date())) return setError('Cannot book in the past.')

    setLoading(true)

    try {
      const { conflict, booking } = await checkConflict(start, end)
      if (conflict) {
        setError(`Conflict with existing booking by ${booking.userName} (${booking.startTime}–${booking.endTime}).`)
        return
      }

      const newRef = push(ref(db, 'bookings'))
      await set(newRef, {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: userProfile?.name || currentUser.email,
        date,
        startTime,
        endTime,
        purpose,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      })

      if (EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY) {
        emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: currentUser.email,
            to_name: userProfile?.name || 'User',
            equipment_name: equipment.name,
            booking_date: format(start, 'EEEE, MMMM d, yyyy'),
            booking_time: `${startTime} – ${endTime}`,
            purpose: purpose || '—',
          },
          EMAILJS_PUBLIC_KEY
        ).catch(() => {})
      }

      onSuccess()
    } catch {
      setError('Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Book Equipment</h2>
              <p className="text-blue-600 font-medium mt-0.5">{equipment.name}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description of your experiment..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
