import { useState, useEffect, useRef } from 'react'
import { subscribeEquipment, addEquipment, updateEquipment, deleteEquipment, subscribeAllBookings, updateBooking, updateProfileRole } from '$backend'
import { format, parseISO } from 'date-fns'
import useUserActivity from '../grab/useUserActivity'

export default function Admin() {
  const [tab, setTab] = useState('equipment')
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['equipment', 'bookings', 'users'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`pb-2 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
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

const DEFAULT_EQUIPMENT = ['冻干机', '高压均质机', '微射流', '流化床', '研究院二楼会议室']

function EquipmentManager() {
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const nameRef = useRef()
  const descRef = useRef()

  useEffect(() => subscribeEquipment(setEquipment), [])

  async function handleAdd(e) {
    e.preventDefault()
    const name = nameRef.current?.value?.trim()
    if (!name) return
    setLoading(true)
    try {
      await addEquipment(name, descRef.current?.value || '')
      nameRef.current.value = ''
      if (descRef.current) descRef.current.value = ''
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setLoading(false) }
  }

  async function handleSeedDefaults() {
    setSeeding(true)
    try {
      const existing = equipment.map(e => e.name)
      for (const name of DEFAULT_EQUIPMENT) {
        if (!existing.includes(name)) await addEquipment(name)
      }
    } catch (err) { alert('Failed: ' + err.message) }
    finally { setSeeding(false) }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-800 mb-4">Add Equipment</h3>
        <div className="space-y-3">
          <input ref={nameRef} type="text" placeholder="Equipment name"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input ref={descRef} type="text" placeholder="Description (optional)"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
              {loading ? 'Adding...' : 'Add Equipment'}
            </button>
            <button type="button" onClick={handleSeedDefaults} disabled={seeding}
              className="border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
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
              <button onClick={() => updateEquipment(eq.id, { available: !eq.available })}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${eq.available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {eq.available ? 'Available' : 'Unavailable'}
              </button>
              <button onClick={() => { if (confirm(`Delete "${eq.name}"?`)) deleteEquipment(eq.id) }}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 transition-colors">
                Delete
              </button>
            </div>
          </div>
        ))}
        {equipment.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No equipment added yet.</p>}
      </div>
    </div>
  )
}

function BookingsManager() {
  const [bookings, setBookings] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => subscribeAllBookings(setBookings), [])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['all', 'confirmed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors capitalize ${filter === f ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(b => (
          <div key={b.id} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <div className="font-medium text-gray-800">{b.equipmentName}</div>
              <div className="text-gray-500 text-xs mt-0.5">{format(parseISO(b.date), 'MMM d, yyyy')} · {b.startTime}–{b.endTime}</div>
              <div className="text-gray-400 text-xs">{b.userName} ({b.userEmail})</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {b.status}
              </span>
              {b.status === 'confirmed' && (
                <button onClick={() => { if (confirm('Cancel this booking?')) updateBooking(b.id, { status: 'cancelled' }) }}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No bookings found.</p>}
      </div>
    </div>
  )
}

const USER_FILTERS = [['all', 'All'], ['booking', '🔬 Booking'], ['grab', '🧋 Grab'], ['both', 'Both'], ['none', 'No activity']]

function UsersManager() {
  const { rows, grabError } = useUserActivity()
  const [filter, setFilter] = useState('all')
  const counts = Object.fromEntries(USER_FILTERS.map(([k]) => [k, k === 'all' ? rows.length : rows.filter(r => r.kind === k).length]))
  const shown = filter === 'all' ? rows : rows.filter(r => r.kind === filter)

  async function toggleAdmin(user) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    if (newRole === 'admin' && !confirm(`Make ${user.name} an admin?`)) return
    await updateProfileRole(user.id, newRole)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {USER_FILTERS.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${filter === k ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {label} <span className="text-xs opacity-70">{counts[k]}</span>
          </button>
        ))}
      </div>
      {grabError && <p className="text-xs text-red-500">Couldn't load Grab activity: {grabError}</p>}
      <div className="space-y-2">
        {shown.map(u => (
          <div key={u.id} className={`bg-white border border-gray-200 border-l-4 rounded-xl px-4 py-3 flex items-center justify-between ${
            u.kind === 'booking' ? 'border-l-blue-500' : u.kind === 'grab' ? 'border-l-amber-400' : u.kind === 'both' ? 'border-l-purple-500' : 'border-l-gray-200'}`}>
            <div>
              <div className="font-medium text-gray-800 text-sm">{u.name}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {u.nBooking > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🔬 Booking · {u.nBooking}</span>
                )}
                {u.nGrab > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🧋 Grab · {u.nGrab}</span>
                )}
                {u.kind === 'none' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">No activity yet</span>
                )}
              </div>
            </div>
            <button onClick={() => toggleAdmin(u)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${u.role === 'admin' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {u.role === 'admin' ? 'Admin' : 'User'}
            </button>
          </div>
        ))}
        {shown.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No users here.</p>}
      </div>
    </div>
  )
}
