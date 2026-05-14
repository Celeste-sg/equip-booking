import { useState, useEffect, useRef } from 'react'
import {
  collection, doc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, where,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getAuth } from 'firebase/auth'

const PID = import.meta.env.VITE_FIREBASE_PROJECT_ID
const API_KEY = import.meta.env.VITE_FIREBASE_API_KEY
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)/documents`

async function getToken() {
  return getAuth().currentUser.getIdToken(false)
}

async function fsGet(path) {
  const token = await getToken()
  const res = await fetch(`${FS_BASE}/${path}`, { headers: { Authorization: `Bearer ${token}` } })
  return res.json()
}

async function fsPost(col, fields) {
  const token = await getToken()
  const res = await fetch(`${FS_BASE}/${col}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fsPatch(path, fields) {
  const token = await getToken()
  const updateMask = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join('&')
  const res = await fetch(`${FS_BASE}/${path}?${updateMask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function fsDelete(path) {
  const token = await getToken()
  await fetch(`${FS_BASE}/${path}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
}
import { format, parseISO } from 'date-fns'

export default function Admin() {
  const [tab, setTab] = useState('equipment')

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['equipment', 'bookings', 'users'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'equipment' && <EquipmentManager />}
      {tab === 'bookings' && <BookingsManager />}
      {tab === 'users' && <UsersManager />}
    </div>
  )
}

const DEFAULT_EQUIPMENT = ['冻干机', '高压均质机', '微射流', '流化床']

function EquipmentManager() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const nameRef = useRef()
  const descRef = useRef()

  useEffect(() => {
    async function fetchEquipment() {
      try {
        const json = await fsGet('equipment')
        const list = (json.documents || []).map(d => ({
          id: d.name.split('/').pop(),
          name: d.fields?.name?.stringValue || '',
          description: d.fields?.description?.stringValue || '',
          available: d.fields?.available?.booleanValue ?? true,
        }))
        setEquipment(list)
      } catch (err) {
        console.warn('Failed to load equipment:', err.message)
      }
    }
    fetchEquipment()
  }, [])

  async function addEquipmentDoc(name, description = '') {
    await fsPost('equipment', {
      name: { stringValue: name.trim() },
      description: { stringValue: description.trim() },
      available: { booleanValue: true },
      createdAt: { stringValue: new Date().toISOString() },
    })
    // Reload list after add
    const json = await fsGet('equipment')
    setEquipment((json.documents || []).map(d => ({
      id: d.name.split('/').pop(),
      name: d.fields?.name?.stringValue || '',
      description: d.fields?.description?.stringValue || '',
      available: d.fields?.available?.booleanValue ?? true,
    })))
  }

  async function handleAdd(e) {
    e.preventDefault()
    const nameVal = nameRef.current?.value?.trim()
    if (!nameVal) return
    setLoading(true)
    try {
      await addEquipmentDoc(nameVal, descRef.current?.value || '')
      nameRef.current.value = ''
      if (descRef.current) descRef.current.value = ''
    } catch (err) {
      alert('Failed to add equipment: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      const existing = equipment.map(e => e.name)
      for (const name of DEFAULT_EQUIPMENT) {
        if (!existing.includes(name)) await addEquipmentDoc(name)
      }
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  async function toggleAvailable(eq) {
    await fsPatch(`equipment/${eq.id}`, { available: { booleanValue: !eq.available } })
    setEquipment(prev => prev.map(e => e.id === eq.id ? { ...e, available: !e.available } : e))
  }

  async function handleDelete(eq) {
    if (!confirm(`Delete "${eq.name}"? This won't delete existing bookings.`)) return
    await fsDelete(`equipment/${eq.id}`)
    setEquipment(prev => prev.filter(e => e.id !== eq.id))
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-800 mb-4">Add Equipment</h3>
        <div className="space-y-3">
          <input
            ref={nameRef}
            type="text"
            placeholder="Equipment name"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            ref={descRef}
            type="text"
            placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Adding...' : 'Add Equipment'}
            </button>
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              {seeding ? 'Importing...' : '一键导入预设设备'}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-2">
        {equipment.map((eq) => (
          <div key={eq.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-800 text-sm">{eq.name}</div>
              {eq.description && <div className="text-xs text-gray-500">{eq.description}</div>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAvailable(eq)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  eq.available
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {eq.available ? 'Available' : 'Unavailable'}
              </button>
              <button
                onClick={() => handleDelete(eq)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {equipment.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No equipment added yet.</p>
        )}
      </div>
    </div>
  )
}

function BookingsManager() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('date', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function handleCancel(booking) {
    if (!confirm('Cancel this booking?')) return
    await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' })
  }

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'confirmed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors capitalize ${
              filter === f ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((b) => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-gray-800">{b.equipmentName}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {format(parseISO(b.date), 'MMM d, yyyy')} · {b.startTime}–{b.endTime}
              </div>
              <div className="text-gray-400 text-xs">{b.userName} ({b.userEmail})</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {b.status}
              </span>
              {b.status === 'confirmed' && (
                <button
                  onClick={() => handleCancel(b)}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No bookings found.</p>
        )}
      </div>
    </div>
  )
}

function UsersManager() {
  const [users, setUsers] = useState([])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  async function toggleAdmin(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (
      newRole === 'admin' &&
      !confirm(`Make ${user.name} an admin? They can manage all equipment and bookings.`)
    ) return
    await updateDoc(doc(db, 'users', user.id), { role: newRole })
  }

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-800 text-sm">{u.name}</div>
            <div className="text-xs text-gray-500">{u.email}</div>
          </div>
          <button
            onClick={() => toggleAdmin(u)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              u.role === 'admin'
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {u.role === 'admin' ? 'Admin' : 'User'}
          </button>
        </div>
      ))}
      {users.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-8">No users yet.</p>
      )}
    </div>
  )
}
