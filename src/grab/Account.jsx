import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const inputCls = 'w-full border border-gray-300 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400'
const btnCls = 'w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-base font-semibold rounded-2xl py-3'

function zhError(err) {
  const m = (err?.message || err?.code || '').toLowerCase()
  if (m.includes('invalid login') || m.includes('wrong-password') || m.includes('invalid-credential')) return '当前密码不对'
  if (m.includes('should be different') || m.includes('same')) return '新密码不能和旧密码一样'
  if (m.includes('at least 6') || m.includes('weak-password')) return '密码至少 6 位'
  if (m.includes('rate limit') || m.includes('too many')) return '操作太频繁，请稍后再试'
  return `失败：${err?.message || '请重试'}`
}

function NameForm() {
  const { userProfile, currentUser, updateName } = useAuth()
  const [name, setName] = useState(userProfile?.name || '')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const next = name.trim()
    if (!next) return setMsg({ error: '用户名不能为空' })
    setBusy(true)
    setMsg(null)
    try {
      await updateName(next)
      setMsg({ ok: '用户名已更新' })
    } catch (err) {
      setMsg({ error: zhError(err) })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-500">👤 用户名</div>
      <p className="text-xs text-gray-400">同事在 Grab 和仪器预约里看到的名字。登录邮箱：{currentUser.email}</p>
      <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="用户名" />
      {msg?.error && <p className="text-red-500 text-sm">{msg.error}</p>}
      {msg?.ok && <p className="text-green-600 text-sm">{msg.ok}</p>}
      <button type="submit" disabled={busy || name.trim() === (userProfile?.name || '')} className={btnCls}>
        {busy ? '保存中…' : '保存用户名'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const { currentUser, changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (next.length < 6) return setMsg({ error: '新密码至少 6 位' })
    if (next !== confirm) return setMsg({ error: '两次输入的新密码不一致' })
    setBusy(true)
    setMsg(null)
    try {
      await changePassword(currentUser.email, current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setMsg({ ok: '密码已修改，下次登录请使用新密码' })
    } catch (err) {
      setMsg({ error: zhError(err) })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-500">🔒 修改密码</div>
      <p className="text-xs text-gray-400">和仪器预约是同一个账号，两边都会生效。</p>
      <input className={inputCls} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required placeholder="当前密码" autoComplete="current-password" />
      <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} required placeholder="新密码（至少 6 位）" autoComplete="new-password" />
      <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="再输入一次新密码" autoComplete="new-password" />
      {msg?.error && <p className="text-red-500 text-sm">{msg.error}</p>}
      {msg?.ok && <p className="text-green-600 text-sm">{msg.ok}</p>}
      <button type="submit" disabled={busy} className={btnCls}>{busy ? '提交中…' : '修改密码'}</button>
    </form>
  )
}

export default function Account() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/grab" className="text-gray-400 text-xl px-2">‹</Link>
        <h1 className="text-xl font-bold">账号设置</h1>
      </div>
      <NameForm />
      <PasswordForm />
    </div>
  )
}
