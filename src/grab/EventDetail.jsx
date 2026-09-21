import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { completeEvent, deleteEvent, getEvent, setPickupStatus, joinEvent, leaveEvent, removeQr, signedUrl, uploadQr } from './api'
import PayCodeSettings from './PayCodeSettings'
import GroupImage from './GroupImage'
import { TYPES, STATUS_LABEL, effectiveStatus, fmtDateTime, fmtTime, mapUrl, openAmap } from './util'

const inputCls = 'w-full border border-gray-300 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400'

// Creator taps to load the participant's pickup QR (private bucket -> signed URL).
function QrView({ path }) {
  const [url, setUrl] = useState(null)
  const [failed, setFailed] = useState(false)
  if (url) return <img src={url} alt="取餐码" className="w-full max-w-xs mt-2 rounded-xl" />
  return (
    <button onClick={() => signedUrl('grab-qr', path).then(setUrl).catch(() => setFailed(true))} className="text-sm text-amber-600 underline">
      {failed ? '加载失败，重试' : '查看取餐码'}
    </button>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ file: null, quantity: '', note: '' })

  const load = useCallback(() => {
    getEvent(id).then(setData).catch(() => setError('找不到这个活动'))
  }, [id])
  useEffect(load, [load])

  if (!data) return <p className={`py-8 text-center ${error ? 'text-red-500' : 'text-gray-400'}`}>{error || '加载中…'}</p>

  const { event, names, privateInfo } = data
  const t = TYPES[event.type]
  const status = effectiveStatus(event)
  const participants = event.grab_participants
  const mine = participants.find(p => p.user_id === currentUser.uid)
  const isFull = event.max_participants != null && participants.length >= event.max_participants
  const isPickup = event.type === 'pickup'
  const isCreator = currentUser.uid === event.creator_id
  // The pickup organizer collects orders, so they can't submit one to their own event.
  const canJoin = status === 'open' && !mine && !isFull && !(isPickup && isCreator)

  async function act(fn) {
    setBusy(true)
    setError('')
    try { await fn(); load() } catch { setError('操作失败，可能已截止或已满') }
    setBusy(false)
  }

  async function joinPickup() {
    if (!form.file) return setError('请先上传取餐二维码')
    setBusy(true)
    setError('')
    let path
    try {
      path = await uploadQr(currentUser.uid, event.id, form.file)
      await joinEvent(event.id, currentUser.uid, {
        qr_path: path,
        quantity: form.quantity ? Number(form.quantity) : null,
        note: form.note.trim() || null,
      })
      navigate(`/grab/event/${event.id}/pay`)
    } catch (err) {
      console.error('joinPickup failed', err)
      if (path) removeQr(path)
      setError(`${path ? '报名失败' : '上传失败'}：${err.message || err}`)
      setBusy(false)
    }
  }

  async function remove() {
    const n = participants.length
    if (!window.confirm(n ? `已有 ${n} 人参加，确定删除这个活动吗？` : '确定删除这个活动吗？')) return
    setBusy(true)
    setError('')
    try {
      await deleteEvent(event.id, participants.map(p => p.qr_path).filter(Boolean), privateInfo?.group_image_path)
      navigate('/grab', { replace: true })
    } catch {
      setError('删除失败，请重试')
      setBusy(false)
    }
  }

  function complete() {
    if (!window.confirm('确定标记为已完成吗？完成后不能再修改。')) return
    act(() => completeEvent(event.id))
  }

  async function leave() {
    await act(async () => {
      if (mine?.qr_path) removeQr(mine.qr_path)
      await leaveEvent(event.id, currentUser.uid)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/grab" className="text-gray-400 text-xl px-2">‹</Link>
        <h1 className="text-xl font-bold">{t.emoji} {event.store_name}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-1 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>{names[event.creator_id] || '?'} {isPickup ? '帮带' : '发起'}</span>
          <span className={status === 'open' ? 'text-green-600' : 'text-gray-400'}>{STATUS_LABEL[status]}</span>
        </div>
        <div>报名截止：{fmtDateTime(event.deadline)}</div>
        {event.expected_pickup_time && <div>预计取餐：{fmtTime(event.expected_pickup_time)}</div>}
        {event.location_text && (
          <div>
            地址：{event.location_text}{' '}
            <a href={mapUrl(event.location_text)} target="_blank" rel="noreferrer"
              onClick={(e) => { e.preventDefault(); openAmap(event.location_text) }}
              className="text-blue-500 underline whitespace-nowrap">📍 用高德地图打开</a>
          </div>
        )}
        {event.max_participants && <div>人数上限：{event.max_participants}</div>}
        {isPickup && event.note && <div className="text-gray-500">备注：{event.note}</div>}
        {!isPickup && privateInfo?.wechat_id && <div className="text-gray-500">发起人微信号：{privateInfo.wechat_id}</div>}
        {!isCreator && !mine && (
          <div className="text-xs text-gray-400 pt-1">🔒 参加后可查看发起人的微信号和群二维码</div>
        )}
      </div>

      <GroupImage event={event} path={privateInfo?.group_image_path} userId={currentUser.uid} canEdit={isCreator && status !== 'completed'} onChanged={load} />

      {isPickup && canJoin && (
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
          <p className="text-sm text-gray-500">先在瑞幸小程序自己下单，然后上传取餐二维码。帮带费自愿支付，金额随意 ☕</p>
          <label className="block border-2 border-dashed border-amber-300 rounded-2xl py-6 text-center text-amber-600 active:bg-amber-50">
            {form.file ? `✅ ${form.file.name}` : '📷 上传取餐二维码'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} />
          </label>
          <input className={inputCls} type="number" min="1" inputMode="numeric" placeholder="杯数（选填）" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className={inputCls} placeholder="备注（选填）" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      )}

      {canJoin && (
        <button disabled={busy} onClick={isPickup ? joinPickup : () => act(() => joinEvent(event.id, currentUser.uid))}
          className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl py-3.5">
          {isPickup ? '提交取餐码' : '我要参加'}
        </button>
      )}
      {isPickup && mine && !mine.paid && (
        <Link to={`/grab/event/${event.id}/pay`} className="block text-center bg-amber-500 active:bg-amber-600 text-white text-lg font-semibold rounded-2xl py-3.5">
          ☕ 自愿支付帮带费
        </Link>
      )}
      {mine && status === 'open' && (
        <button disabled={busy} onClick={leave} className="w-full bg-gray-200 active:bg-gray-300 disabled:opacity-50 text-gray-700 text-lg rounded-2xl py-3.5">
          退出
        </button>
      )}
      {status === 'open' && !mine && isFull && <p className="text-center text-gray-400 text-sm">人数已满</p>}
      {status === 'closed' && <p className="text-center text-gray-400 text-sm">已截止，不能再加入或退出</p>}
      {status === 'completed' && <p className="text-center text-gray-400 text-sm">活动已完成</p>}
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {isCreator && status !== 'completed' && (
        <button disabled={busy} onClick={complete} className="w-full bg-green-500 active:bg-green-600 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl py-3.5">
          ✅ 标记为已完成
        </button>
      )}
      {isCreator && status !== 'completed' && (
        <div className="flex gap-3">
          <Link to={`/grab/event/${event.id}/edit`} className="flex-1 text-center bg-white border border-gray-300 active:bg-gray-50 text-gray-700 rounded-2xl py-3">
            ✏️ 修改
          </Link>
          <button disabled={busy} onClick={remove} className="flex-1 bg-white border border-red-300 active:bg-red-50 disabled:opacity-50 text-red-500 rounded-2xl py-3">
            🗑 删除
          </button>
        </div>
      )}

      {isPickup && isCreator && status !== 'completed' && <PayCodeSettings userId={currentUser.uid} />}

      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="text-sm font-semibold text-gray-500 mb-2">{participants.length} 人参加</div>
        {participants.length === 0 && <p className="text-gray-400 text-sm">还没有人参加</p>}
        <ul className="divide-y divide-gray-100">
          {participants.map(p => (
            <li key={p.id} className="py-2">
              <div className="flex justify-between items-center">
                <span>{names[p.user_id] || '?'}{p.user_id === event.creator_id && ' 👑'}</span>
                {isPickup && (isCreator || p.user_id === currentUser.uid) && (
                  <span className="text-sm text-gray-500">
                    {p.quantity ? `×${p.quantity} ` : ''}
                    {p.paid && <span className="text-green-600">已支付帮带费 ❤️</span>}
                  </span>
                )}
              </div>
              {isPickup && (isCreator || p.user_id === currentUser.uid) && (
                isCreator && status !== 'completed' ? (
                  <button disabled={busy}
                    onClick={() => act(() => setPickupStatus(p.id, p.pickup_status === 'picked_up' ? 'pending' : 'picked_up'))}
                    className={`mt-2 w-full rounded-xl py-2 text-sm font-medium disabled:opacity-50 ${p.pickup_status === 'picked_up' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}>
                    {p.pickup_status === 'picked_up' ? '✅ 已取餐（点击撤销）' : '待取餐（点击标记已取）'}
                  </button>
                ) : (
                  <div className={`text-xs mt-1 ${p.pickup_status === 'picked_up' ? 'text-green-600' : 'text-gray-400'}`}>
                    {p.pickup_status === 'picked_up' ? '✅ 已取餐' : '待取餐'}
                  </div>
                )
              )}
              {isPickup && isCreator && p.note && <div className="text-xs text-gray-400">{p.note}</div>}
              {isPickup && isCreator && p.qr_path && <QrView path={p.qr_path} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
