import { useState, useEffect } from 'react'
import { subscribeEquipment, subscribeBookingsByEquipment, subscribeBookingsByUser } from '$backend'
import WeekCalendar from '../components/WeekCalendar'
import BookingModal from '../components/BookingModal'
import BookingDetailModal from '../components/BookingDetailModal'
import { useAuth } from '../contexts/AuthContext'
import { format, isFuture, parseISO } from 'date-fns'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const [equipment, setEquipment] = useState([])
  const [selectedEquipment, setSelectedEquipment] = useState(null)
  const [bookings, setBookings] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [myBookings, setMyBookings] = useState([])
  const [tab, setTab] = useState('calendar')
  const [loadingEquipment, setLoadingEquipment] = useState(true)

  useEffect(() => {
    const unsub = subscribeEquipment((list) => {
      const available = list.filter(e => e.available)
      setEquipment(available)
      setSelectedEquipment(prev => prev ?? (available[0] || null))
      setLoadingEquipment(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!selectedEquipment) return
    const unsub = subscribeBookingsByEquipment(selectedEquipment.id, setBookings)
    return unsub
  }, [selectedEquipment])

  useEffect(() => {
    if (!currentUser) return
    const unsub = subscribeBookingsByUser(currentUser.uid, setMyBookings)
    return unsub
  }, [currentUser])

  function handleSlotClick(day) { setSelectedDate(day); setShowBookingModal(true) }
  function handleBookingClick(booking) { setSelectedBooking(booking); setShowDetailModal(true) }

  const upcomingMine = myBookings.filter(
    (b) => b.status !== 'cancelled' && isFuture(parseISO(`${b.date}T${b.endTime}`))
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800 mb-3">Equipment Booking</h1>
        {loadingEquipment ? (
          <div className="text-sm text-gray-400 animate-pulse">Loading equipment...</div>
        ) : equipment.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3">
            No equipment found. An admin needs to add equipment first.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {equipment.map((eq) => (
              <button
                key={eq.id}
                onClick={() => setSelectedEquipment(eq)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  selectedEquipment?.id === eq.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {eq.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEquipment && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">{selectedEquipment.name}</h2>
              {selectedEquipment.description && (
                <p className="text-sm text-gray-500">{selectedEquipment.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTab('calendar')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tab === 'calendar' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Calendar
              </button>
              <button
                onClick={() => setTab('mine')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${tab === 'mine' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
              >
                My Bookings {upcomingMine.length > 0 && <span className="ml-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">{upcomingMine.length}</span>}
              </button>
              <button
                onClick={() => { setSelectedDate(new Date()); setShowBookingModal(true) }}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                + Book
              </button>
            </div>
          </div>

          {tab === 'calendar' ? (
            <WeekCalendar bookings={bookings} equipment={selectedEquipment} onSlotClick={handleSlotClick} onBookingClick={handleBookingClick} />
          ) : (
            <MyBookingsList bookings={myBookings} onBookingClick={handleBookingClick} />
          )}
        </>
      )}

      {showBookingModal && selectedEquipment && (
        <BookingModal equipment={selectedEquipment} selectedDate={selectedDate} onClose={() => setShowBookingModal(false)} onSuccess={() => setShowBookingModal(false)} />
      )}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setShowDetailModal(false)} onCancelled={() => setShowDetailModal(false)} />
      )}
    </div>
  )
}

function MyBookingsList({ bookings, onBookingClick }) {
  if (bookings.length === 0) {
    return <div className="text-center py-12 text-gray-500"><div className="text-4xl mb-3">📅</div><p>No bookings yet</p></div>
  }
  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div key={b.id} onClick={() => onBookingClick(b)} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all">
          <div>
            <div className="font-medium text-gray-800 text-sm">{b.equipmentName}</div>
            <div className="text-xs text-gray-500 mt-0.5">{format(parseISO(b.date), 'EEE, MMM d')} · {b.startTime}–{b.endTime}</div>
            {b.purpose && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{b.purpose}</div>}
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {b.status}
          </span>
        </div>
      ))}
    </div>
  )
}
