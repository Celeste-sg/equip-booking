import { supabase } from '../backends/supabase/index.js'

async function fetchNames() {
  const { data } = await supabase.rpc('grab_profile_names')
  return Object.fromEntries((data || []).map(p => [p.id, p.name]))
}

export async function listActiveEvents() {
  const [{ data, error }, names, organizer] = await Promise.all([
    supabase.from('grab_events')
      .select('*, grab_participants(user_id)')
      .eq('status', 'open')
      .gt('deadline', new Date().toISOString())
      .order('deadline'),
    fetchNames(),
    supabase.rpc('grab_pickup_organizer_id'),
  ])
  if (error) throw error
  // organizerId: the featured pickup organiser, whose trip is pinned on the home page.
  return { events: data || [], names, organizerId: organizer.data || null }
}

export async function getEvent(id) {
  const [{ data, error }, names, priv] = await Promise.all([
    supabase.from('grab_events').select('*, grab_participants(*)').eq('id', id).single(),
    fetchNames(),
    // RLS only returns this row to the organiser and to people who joined.
    supabase.from('grab_event_private').select('*').eq('event_id', id).maybeSingle(),
  ])
  if (error) throw error
  data.grab_participants.sort((a, b) => a.joined_at.localeCompare(b.joined_at))
  return { event: data, names, privateInfo: priv.data || null }
}

export async function createEvent(fields) {
  const { data, error } = await supabase.from('grab_events').insert(fields).select('id').single()
  if (error) throw error
  return data.id
}

// Organiser-only extras (WeChat ID, group image path); see grab_event_private.
export async function saveEventPrivate(eventId, fields) {
  const { error } = await supabase.from('grab_event_private').upsert({ event_id: eventId, ...fields })
  if (error) throw error
}

export async function updateEvent(id, fields) {
  const { error } = await supabase.from('grab_events').update(fields).eq('id', id)
  if (error) throw error
}

// Deletes the event (participants cascade) and their uploaded pickup QR files.
export async function deleteEvent(id, qrPaths = [], groupImagePath = null) {
  if (qrPaths.length) await supabase.storage.from('grab-qr').remove(qrPaths)
  if (groupImagePath) await supabase.storage.from('grab-group').remove([groupImagePath])
  const { error } = await supabase.from('grab_events').delete().eq('id', id)
  if (error) throw error
}

export async function completeEvent(id) {
  const { error } = await supabase.from('grab_events')
    .update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function setPickupStatus(participantId, status) {
  const { error } = await supabase.from('grab_participants').update({ pickup_status: status }).eq('id', participantId)
  if (error) throw error
}

// Everything I created or joined, newest first.
export async function listMyEvents(userId) {
  const [created, joined, names] = await Promise.all([
    supabase.from('grab_events').select('*, grab_participants(user_id)').eq('creator_id', userId),
    supabase.from('grab_participants').select('grab_events(*, grab_participants(user_id))').eq('user_id', userId),
    fetchNames(),
  ])
  if (created.error) throw created.error
  if (joined.error) throw joined.error
  const byId = new Map()
  for (const e of created.data) byId.set(e.id, e)
  for (const row of joined.data) if (row.grab_events) byId.set(row.grab_events.id, row.grab_events)
  const events = [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return { events, names }
}

export async function joinEvent(eventId, userId, fields = {}) {
  const { error } = await supabase.from('grab_participants').insert({ event_id: eventId, user_id: userId, ...fields })
  if (error) throw error
}

// Upload a pickup QR screenshot into the user's own folder; returns the storage path.
export async function uploadQr(userId, eventId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${userId}/${eventId}-${Date.now()}.${ext || 'jpg'}`
  const { error } = await supabase.storage.from('grab-qr').upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (error) throw error
  return path
}

export async function removeQr(path) {
  await supabase.storage.from('grab-qr').remove([path])
}

export async function signedUrl(bucket, path) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

// Organiser payment codes: grab-pay/users/<uid>/<method> (method = alipay | wechat).
export async function uploadPayCode(userId, method, file) {
  const { error } = await supabase.storage.from('grab-pay')
    .upload(`users/${userId}/${method}`, file, { upsert: true, contentType: file.type || 'image/jpeg' })
  if (error) throw error
}

// Signed URL of a user's payment code, or null if they haven't uploaded one.
export async function payCodeUrl(userId, method) {
  const { data, error } = await supabase.storage.from('grab-pay').createSignedUrl(`users/${userId}/${method}`, 3600)
  return error ? null : data.signedUrl
}

export async function getPickupOrganizerId() {
  const { data } = await supabase.rpc('grab_pickup_organizer_id')
  return data || null
}

// Group QR image for an event (organiser only): upload, then point the event at it.
export async function setGroupImage(userId, eventId, file, oldPath) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${userId}/${eventId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('grab-group').upload(path, file, { contentType: file.type || 'image/jpeg' })
  if (error) throw error
  try {
    await saveEventPrivate(eventId, { group_image_path: path })
  } catch (err) {
    await supabase.storage.from('grab-group').remove([path])
    throw err
  }
  if (oldPath) await supabase.storage.from('grab-group').remove([oldPath])
}

export async function clearGroupImage(eventId, path) {
  await saveEventPrivate(eventId, { group_image_path: null })
  await supabase.storage.from('grab-group').remove([path])
}

export async function markPaid(eventId, userId) {
  const { error } = await supabase.from('grab_participants').update({ paid: true })
    .eq('event_id', eventId).eq('user_id', userId)
  if (error) throw error
}

export async function leaveEvent(eventId, userId) {
  const { error } = await supabase.from('grab_participants').delete().eq('event_id', eventId).eq('user_id', userId)
  if (error) throw error
}
