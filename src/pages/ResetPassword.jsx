import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const inputCls = 'w-full border border-gray-300 rounded-2xl px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-amber-400'
const btnCls = 'w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-base font-semibold rounded-2xl py-3'

function zhError(err) {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('should be different') || m.includes('same')) return '新密码不能和旧密码一样'
  if (m.includes('at least 6')) return '密码至少 6 位'
  if (m.includes('session') || m.includes('jwt') || m.includes('expired')) return '链接已过期，请回到登录页重新点「忘记密码」'
  return `失败：${err?.message || '请重试'}`
}

// Shown instead of the app when it is opened from a reset-password email link.
export default function ResetPassword() {
  const { recovery, setRecovery, setNewPassword } = useAuth()
  const navigate = useNavigate()
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // resetPassword() adds ?next=grab when the request came from the Grab login page.
  function leave() {
    const toGrab = new URLSearchParams(window.location.search).get('next') === 'grab'
    window.history.replaceState(null, '', window.location.pathname + window.location.hash)
    setRecovery(null)
    navigate(toGrab ? '/grab' : '/', { replace: true })
  }

  async function submit(e) {
    e.preventDefault()
    if (next.length < 6) return setError('新密码至少 6 位')
    if (next !== confirm) return setError('两次输入的新密码不一致')
    setBusy(true)
    setError('')
    try {
      await setNewPassword(next)
      leave()
    } catch (err) {
      setError(zhError(err))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold">设置新密码</h1>
          <p className="text-sm text-gray-400 mt-1">Set a new password</p>
        </div>

        {recovery === 'expired' ? (
          <div className="space-y-4">
            <p className="text-red-500 text-sm">这个重置链接已失效或已经用过了。请回到登录页，重新点「忘记密码」获取新邮件，并尽快点击最新那封里的链接。</p>
            <button type="button" onClick={leave} className={btnCls}>返回登录</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} required placeholder="新密码（至少 6 位）" autoComplete="new-password" />
            <input className={inputCls} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="再输入一次新密码" autoComplete="new-password" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={busy} className={btnCls}>{busy ? '提交中…' : '保存新密码'}</button>
          </form>
        )}
        <p className="text-xs text-gray-400 text-center mt-4">仪器预约和 Grab 是同一个账号，两边都会生效。</p>
      </div>
    </div>
  )
}
