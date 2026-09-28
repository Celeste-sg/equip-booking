import { useEffect, useState } from 'react'
import { subscribeAllProfiles, subscribeAllBookings } from '$backend'
import { countGrabActivityByUser } from './api'

// Admin view of every registered user. Both apps share one account table;
// profiles.signup_app ('booking' | 'grab' | null) says which app's list a user belongs to.
// Activity counts are shown alongside, since a user may also use the other app.
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
    return { ...u, nBooking, nGrab, grabCreated: created, grabJoined: joined }
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  // Split by registered app; the profiles subscription picks up changes from setSignupApp.
  const byApp = (app) => rows.filter(r => (r.signup_app || null) === app)
  return { byApp, grabError }
}
