import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createEvent, getEvent, joinEvent, saveEventPrivate, updateEvent } from './api'
import { TYPES, defaultLocalTime, toLocalInput, PICKUP_STORE, PICKUP_ADDRESS, DELIVERY_APPS } from './util'

const inputCls = 'w-full border border-gray-300 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600 mb-1 block">{label}</span>
      {children}
    </label>
  )
}

// /grab/new/:type creates an event; /grab/event/:id/edit edits one (creator only).
export default function CreateEvent() {
  const { type, id } = useParams()
  const { currentUser } = useAuth()
  const [loaded, setLoaded] = useState(null) // { event, privateInfo }
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getEvent(id).then(({ event, privateInfo }) => setLoaded({ event, privateInfo })).catch(() => setError('找不到这个活动'))
  }, [id])

  if (!id) return <EventForm type={type} />
  if (error) return <p className="text-red-500 py-8 text-center">{error}</p>
  if (!loaded) return <p className="text-gray-400 py-8 text-center">加载中…</p>
  const { event, privateInfo } = loaded
  if (event.creator_id !== currentUser.uid) return <Navigate to={`/grab/event/${id}`} replace />
  return <EventForm type={event.type} event={event} privateInfo={privateInfo} />
}

function EventForm({ type, event, privateInfo }) {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(event ? {
    store_name: event.store_name,
    location_text: event.location_text || '',
    // Group orders keep the WeChat ID in the participants-only table.
    note: (event.type === 'group_order' ? privateInfo?.wechat_id : event.note) || '',
    deadline: toLocalInput(event.deadline),
    expected_pickup_time: event.expected_pickup_time ? toLocalInput(event.expected_pickup_time) : '',
    max_participants: event.max_participants ?? '',
  } : {
    store_name: type === 'pickup' ? PICKUP_STORE : '',
    location_text: type === 'pickup' ? PICKUP_ADDRESS : '',
    note: '',
    deadline: defaultLocalTime(30),
    expected_pickup_time: '',
    max_participants: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!TYPES[type]) return <Navigate to="/grab" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    if (!form.store_name.trim()) return setError(type === 'pickup' ? '请填写店名' : '请填写外卖App')
    if (new Date(form.deadline) <= new Date()) return setError('截止时间要晚于现在')
    const joined = event ? event.grab_participants.length : 0
    if (form.max_participants && Number(form.max_participants) < joined) return setError(`已有 ${joined} 人参加，上限不能更小`)
    setSaving(true)
    setError('')
    try {
      const fields = {
        store_name: form.store_name.trim(),
        location_text: type === 'pickup' ? form.location_text.trim() || null : null,
        note: type === 'pickup' ? form.note.trim() || null : null,
        deadline: new Date(form.deadline).toISOString(),
        expected_pickup_time: type === 'pickup' && form.expected_pickup_time
          ? new Date(form.expected_pickup_time).toISOString() : null,
        max_participants: type === 'group_order' && form.max_participants ? Number(form.max_participants) : null,
      }
      const wechat = form.note.trim() || null
      if (event) {
        await updateEvent(event.id, fields)
        if (type === 'group_order') await saveEventPrivate(event.id, { wechat_id: wechat })
        navigate(`/grab/event/${event.id}`, { replace: true })
        return
      }
      const id = await createEvent({ ...fields, type, creator_id: currentUser.uid })
      if (type === 'group_order') {
        if (wechat) await saveEventPrivate(id, { wechat_id: wechat })
        // The starter of a group order is the first participant.
        await joinEvent(id, currentUser.uid)
      }
      navigate(`/grab/event/${id}`, { replace: true })
    } catch {
      setError(event ? '保存失败，请重试' : '创建失败，请重试')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={event ? `/grab/event/${event.id}` : '/grab'} className="text-gray-400 text-xl px-2">‹</Link>
        <h1 className="text-xl font-bold">{TYPES[type].emoji} {event ? '修改活动' : TYPES[type].label}</h1>
      </div>

      {type === 'pickup' ? (
        <>
          <Field label="店名">
            <input className={inputCls} value={form.store_name} onChange={set('store_name')} />
          </Field>
          <Field label="门店地址">
            <input className={inputCls} value={form.location_text} onChange={set('location_text')} />
          </Field>
        </>
      ) : (
        <Field label="外卖App">
          <div className="flex flex-wrap gap-2 mb-2">
            {DELIVERY_APPS.map(app => (
              <button type="button" key={app} onClick={() => setForm({ ...form, store_name: app })}
                className={`px-4 py-2 rounded-full text-sm ${form.store_name === app ? 'bg-pink-500 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
                {app}
              </button>
            ))}
          </div>
          <input className={inputCls} value={form.store_name} onChange={set('store_name')} placeholder="淘宝闪购 / 美团外卖 / 京东外卖" />
        </Field>
      )}
      <Field label="报名截止时间">
        <input type="datetime-local" className={inputCls} value={form.deadline} onChange={set('deadline')} />
      </Field>
      {type === 'pickup' && (
        <Field label="预计取餐时间（选填）">
          <input type="datetime-local" className={inputCls} value={form.expected_pickup_time} onChange={set('expected_pickup_time')} />
        </Field>
      )}
      {type === 'group_order' && (
        <Field label="人数上限（选填）">
          <input type="number" min="1" inputMode="numeric" className={inputCls} value={form.max_participants} onChange={set('max_participants')} />
        </Field>
      )}
      <Field label={type === 'group_order' ? '微信号（选填）' : '备注（选填）'}>
        <input className={inputCls} value={form.note} onChange={set('note')} placeholder={type === 'group_order' ? '参加的人才能看到' : ''} />
      </Field>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={saving} className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl py-3.5">
        {saving ? '保存中…' : event ? '保存修改' : '发起'}
      </button>
    </form>
  )
}
