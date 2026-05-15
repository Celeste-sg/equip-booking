import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged as fbOnAuthStateChanged, sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { getDatabase, ref, set, push, update, remove, onValue, query, orderByChild, equalTo, get } from 'firebase/database'
import { areIntervalsOverlapping, parseISO } from 'date-fns'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
})
const auth = getAuth(app)
const db = getDatabase(app)

const normalize = (user) => user ? ({ uid: user.uid, email: user.email, displayName: user.displayName }) : null

// ── Auth ──────────────────────────────────────────────────────────────────────
export function onAuthStateChanged(cb) { return fbOnAuthStateChanged(auth, (u) => cb(normalize(u))) }
export async function login(email, password) { await signInWithEmailAndPassword(auth, email, password) }
export async function signup(email, password, name) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(user, { displayName: name })
  await set(ref(db, `users/${user.uid}`), { uid: user.uid, email, name, role: 'user', createdAt: new Date().toISOString() })
}
export async function logout() { await signOut(auth) }
export async function resetPassword(email) { await sendPasswordResetEmail(auth, email) }

// ── Profiles ──────────────────────────────────────────────────────────────────
export function subscribeProfile(userId, cb) {
  return onValue(ref(db, `users/${userId}`), (snap) => cb(snap.val()))
}
export async function upsertProfile(userId, data) { await set(ref(db, `users/${userId}`), data) }

// ── Equipment ─────────────────────────────────────────────────────────────────
export function subscribeEquipment(cb) {
  return onValue(ref(db, 'equipment'), (snap) => {
    const val = snap.val()
    cb(val ? Object.entries(val).map(([k, v]) => ({ id: k, ...v })) : [])
  })
}
export async function addEquipment(name, description = '') {
  await set(push(ref(db, 'equipment')), { name, description, available: true, createdAt: new Date().toISOString() })
}
export async function updateEquipment(id, data) { await update(ref(db, `equipment/${id}`), data) }
export async function deleteEquipment(id) { await remove(ref(db, `equipment/${id}`)) }

// ── Bookings ──────────────────────────────────────────────────────────────────
const toList = (snap) => {
  const val = snap.val()
  return val ? Object.entries(val).map(([k, v]) => ({ id: k, ...v })) : []
}

export function subscribeBookingsByEquipment(equipmentId, cb) {
  return onValue(query(ref(db, 'bookings'), orderByChild('equipmentId'), equalTo(equipmentId)), (snap) => cb(toList(snap)))
}
export function subscribeBookingsByUser(userId, cb) {
  return onValue(query(ref(db, 'bookings'), orderByChild('userId'), equalTo(userId)), (snap) => {
    const list = toList(snap)
    list.sort((a, b) => b.date.localeCompare(a.date))
    cb(list)
  })
}
export function subscribeAllBookings(cb) {
  return onValue(ref(db, 'bookings'), (snap) => {
    const list = toList(snap)
    list.sort((a, b) => b.date.localeCompare(a.date))
    cb(list)
  })
}
export async function addBooking(data) { await set(push(ref(db, 'bookings')), data) }
export async function updateBooking(id, data) { await update(ref(db, `bookings/${id}`), data) }
export async function checkConflict(equipmentId, date, startTime, endTime) {
  const snap = await get(query(ref(db, 'bookings'), orderByChild('equipmentId'), equalTo(equipmentId)))
  if (!snap.exists()) return { conflict: false }
  const start = parseISO(`${date}T${startTime}`)
  const end = parseISO(`${date}T${endTime}`)
  for (const b of Object.values(snap.val())) {
    if (b.date !== date || b.status === 'cancelled') continue
    if (areIntervalsOverlapping({ start, end }, { start: parseISO(`${date}T${b.startTime}`), end: parseISO(`${date}T${b.endTime}`) }))
      return { conflict: true, booking: b }
  }
  return { conflict: false }
}

// ── Admin: profiles ───────────────────────────────────────────────────────────
export function subscribeAllProfiles(cb) {
  return onValue(ref(db, 'users'), (snap) => {
    const val = snap.val()
    cb(val ? Object.entries(val).map(([k, v]) => ({ id: k, ...v })) : [])
  })
}
export async function updateProfileRole(userId, role) { await update(ref(db, `users/${userId}`), { role }) }

// ── Helpers ───────────────────────────────────────────────────────────────────
export const getAdminEmails = () =>
  (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
