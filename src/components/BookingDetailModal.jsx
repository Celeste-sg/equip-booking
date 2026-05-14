import { ref, update } from 'firebase/database'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { format, parseISO } from 'date-fns'

export default function BookingDetailModal({ booking, onClose, onCancelled }) {
  const { currentUser, isAdmin } = useAuth()
  const canCancel = isAdmin || booking.userId === currentUser?.uid

  async function handleCancel() {
    if (!confirm('Cancel this booking?')) return
    await update(ref(db, `bookings/${booking.id}`), { status: 'cancelled' })
    onCancelled()
    onClose()
  }

  const dateLabel = format(parseISO(booking.date), 'EEEE, MMMM d, yyyy')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-gray-800">Booking Details</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label="Equipment" value={booking.equipmentName} />
          <Row label="Date" value={dateLabel} />
          <Row label="Time" value={`${booking.startTime} – ${booking.endTime}`} />
          <Row label="Booked by" value={`${booking.userName} (${booking.userEmail})`} />
          {booking.purpose && <Row label="Purpose" value={booking.purpose} />}
          <Row
            label="Status"
            value={
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                booking.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {booking.status}
              </span>
            }
          />
        </div>
        {canCancel && booking.status !== 'cancelled' && (
          <div className="px-6 pb-6">
            <button
              onClick={handleCancel}
              className="w-full border border-red-200 text-red-600 hover:bg-red-50 font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancel Booking
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  )
}
