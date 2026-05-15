import { createClient } from '@supabase/supabase-js'
import { areIntervalsOverlapping, parseISO } from 'date-fns'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// camelCase ↔ snake_case converters for bookings
const bookingFromDB = (b) => ({
  id: b.id,
  equipmentId: b.equipment_id,
  equipmentName: b.equipment_name,
  userId: b.user_id,
  userEmail: b.user_email,
  userName: b.user_name,
  date: b.date,
  startTime: b.start_time,
  endTime: b.end_time,
  purpose: b.purpose,
  status: b.status,
  createdAt: b.created_at,
})
const bookingToDB = (b) => ({
  equipment_id: b.equipmentId,
  equipment_name: b.equipmentName,
  user_id: b.userId,
  user_email: b.userEmail,
  user_name: b.userName,
  date: b.date,
  start_time: b.startTime,
  end_time: b.endTime,
  purpose: b.purpose,
  status: b.status,
})

// Helper: initial fetch + real-time re-fetch on any change
function makeSubscription(channelName, table, filter, fetchFn, cb) {
  fetchFn().then(cb)
  const cfg = { event: '*', schema: 'public', table }
  if (filter) cfg.filter = filter
  const channel = supabase.channel(channelName).on('postgres_changes', cfg, () => fetchFn().then(cb)).subscribe()
  return () => supabase.removeChannel(channel)
}

const normalize = (user) => user ? ({ uid: user.id, email: user.email, displayName: user.user_metadata?.name || user.email }) : null

// ── Auth ──────────────────────────────────────────────────────────────────────
export function onAuthStateChanged(cb) {
  supabase.auth.getSession().then(({ data: { session } }) => cb(normalize(session?.user)))
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => cb(normalize(session?.user)))
  return () => subscription.unsubscribe()
}
export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
export async function signup(email, password, name) {
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
  if (error) throw error
}
export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

// ── Profiles ──────────────────────────────────────────────────────────────────
export function subscribeProfile(userId, cb) {
  const fetch = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    return data
  }
  return makeSubscription(`profile-${userId}`, 'profiles', `id=eq.${userId}`, fetch, cb)
}
export async function upsertProfile(userId, data) {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...data })
  if (error) throw error
}

// ── Equipment ─────────────────────────────────────────────────────────────────
export function subscribeEquipment(cb) {
  return makeSubscription('equipment-all', 'equipment', null,
    () => supabase.from('equipment').select('*').order('created_at').then(({ data }) => data || []),
    cb)
}
export async function addEquipment(name, description = '') {
  const { error } = await supabase.from('equipment').insert({ name, description, available: true })
  if (error) throw error
}
export async function updateEquipment(id, data) {
  const { error } = await supabase.from('equipment').update(data).eq('id', id)
  if (error) throw error
}
export async function deleteEquipment(id) {
  const { error } = await supabase.from('equipment').delete().eq('id', id)
  if (error) throw error
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export function subscribeBookingsByEquipment(equipmentId, cb) {
  return makeSubscription(`bookings-eq-${equipmentId}`, 'bookings', `equipment_id=eq.${equipmentId}`,
    () => supabase.from('bookings').select('*').eq('equipment_id', equipmentId).then(({ data }) => (data || []).map(bookingFromDB)),
    cb)
}
export function subscribeBookingsByUser(userId, cb) {
  return makeSubscription(`bookings-user-${userId}`, 'bookings', `user_id=eq.${userId}`,
    () => supabase.from('bookings').select('*').eq('user_id', userId).order('date', { ascending: false }).then(({ data }) => (data || []).map(bookingFromDB)),
    cb)
}
export function subscribeAllBookings(cb) {
  return makeSubscription('bookings-all', 'bookings', null,
    () => supabase.from('bookings').select('*').order('date', { ascending: false }).then(({ data }) => (data || []).map(bookingFromDB)),
    cb)
}
export async function addBooking(data) {
  const { error } = await supabase.from('bookings').insert(bookingToDB(data))
  if (error) throw error
}
export async function updateBooking(id, data) {
  const { error } = await supabase.from('bookings').update(data).eq('id', id)
  if (error) throw error
}
export async function checkConflict(equipmentId, date, startTime, endTime) {
  const { data } = await supabase.from('bookings').select('*')
    .eq('equipment_id', equipmentId).eq('date', date).neq('status', 'cancelled')
  if (!data || !data.length) return { conflict: false }
  const start = parseISO(`${date}T${startTime}`)
  const end = parseISO(`${date}T${endTime}`)
  for (const b of data) {
    if (areIntervalsOverlapping({ start, end }, { start: parseISO(`${date}T${b.start_time}`), end: parseISO(`${date}T${b.end_time}`) }))
      return { conflict: true, booking: bookingFromDB(b) }
  }
  return { conflict: false }
}

// ── Admin: profiles ───────────────────────────────────────────────────────────
export function subscribeAllProfiles(cb) {
  return makeSubscription('profiles-all', 'profiles', null,
    () => supabase.from('profiles').select('*').then(({ data }) => data || []),
    cb)
}
export async function updateProfileRole(userId, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export const getAdminEmails = () =>
  (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
