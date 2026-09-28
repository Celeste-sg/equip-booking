import { useEffect, useState } from 'react'
import { subscribeAllProfiles, subscribeAllBookings } from '$backend'
import { countGrabActivityByUser } from './api'

// Admin view of every registered user. Both apps share one user table, so each
// user is tagged by what they have actually used:
// kind = 'booking' | 'grab' | 'both' | 'none'.
export default function useUserActivity() {
  const [users, setUsers] = useState([])
  const [bookings, setBookings] = useState([])
  const [grabCounts, setGrabCounts] = useState({})
  const [grabError, setGrabError] = useState('')
  useEffect(() => subscribeAllProfiles(setUsers), [])
  useEffect(() => subscribeAllBookings(setBookings), [])
  useEffect(() => { countGrabActivityByUser().then(setGrabCounts).catch(err => setGrabError(err.message)) }, [])

  const bookingCounts = {}
  for (const b of bookings) bookingCounts[b.userId] = (bookingCounts[b.userId] || 0) + 1

  const rows = users.map(u => {
    const nBooking = bookingCounts[u.id] || 0
    const { created = 0, joined = 0 } = grabCounts[u.id] || {}
    const nGrab = created + joined
    const kind = nBooking && nGrab ? 'both' : nBooking ? 'booking' : nGrab ? 'grab' : 'none'
    return { ...u, nBooking, nGrab, grabCreated: created, grabJoined: joined, kind }
  })
  return { rows, grabError }
}
