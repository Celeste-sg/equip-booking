import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const inputCls = 'w-full border border-gray-300 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400'

// Supabase returns English messages; map the common ones.
function zhError(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('invalid login')) return '邮箱或密码不对'
  if (m.includes('already registered')) return '这个邮箱已经注册过了，请直接登录'
  if (m.includes('email not confirmed')) return '邮箱还没确认，请先点击邮件里的确认链接'
  if (m.includes('at least 6')) return '密码至少 6 位'
  if (m.includes('rate limit') || m.includes('too many')) return '操作太频繁，请稍后再试'
  if (m.includes('invalid') && m.includes('email')) return '邮箱格式不对'
  return `失败：${err?.message || '请重试'}`
}

// Same Supabase accounts as instrument booking: an existing user just logs in here.
export default function GrabAuth() {
  const { login, signup, resetPassword } = useAuth()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  function switchMode(next) {
    setMode(next)
    setError('')
    setNotice('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    if (isRegister && password.length < 6) return setError('密码至少 6 位')
    setBusy(true)
    try {
      if (isRegister) {
        await signup(email.trim(), password, name.trim())
        // If email confirmation is off we are logged in and this page unmounts.
        setNotice('注册成功！如果没有自动登录，请先到邮箱点击确认链接，再回来登录。')
      } else {
        await login(email.trim(), password)
      }
    } catch (err) {
      setError(zhError(err))
    }
    setBusy(false)
  }

  async function forgot() {
    if (!email.trim()) return setError('请先填写邮箱')
    try {
      await resetPassword(email.trim())
      setError('')
      setNotice('重置密码邮件已发送，请查收')
    } catch (err) {
      setError(zhError(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">☕🧋</div>
          <h1 className="text-2xl font-bold">Grab</h1>
        </div>

        <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
          {[['login', '登录'], ['register', '注册']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => switchMode(key)}
              className={`flex-1 py-2 rounded-xl text-base font-medium ${mode === key ? 'bg-white shadow text-amber-600' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          {isRegister && (
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required placeholder="姓名（同事看到的名字）" />
          )}
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="邮箱" autoComplete="email" />
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            placeholder={isRegister ? '密码（至少 6 位）' : '密码'} autoComplete={isRegister ? 'new-password' : 'current-password'} />

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {notice && <p className="text-green-600 text-sm">{notice}</p>}

          <button type="submit" disabled={busy} className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl py-3">
            {busy ? '请稍候…' : isRegister ? '注册' : '登录'}
          </button>
        </form>

        {!isRegister && (
          <button type="button" onClick={forgot} className="block mx-auto mt-4 text-sm text-gray-400">忘记密码？</button>
        )}
        <p className="text-xs text-gray-400 text-center mt-4">
          {isRegister ? '已经用过仪器预约？直接登录，账号是同一个。' : '和仪器预约是同一个账号。'}
        </p>
      </div>
    </div>
  )
}
