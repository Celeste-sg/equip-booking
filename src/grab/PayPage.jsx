import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { markPaid, signedUrl } from './api'

const METHODS = {
  alipay: { label: '支付宝', file: 'local-assets/alipay.jpeg', active: 'bg-blue-500 text-white' },
  wechat: { label: '微信', file: 'local-assets/wechat.jpeg', active: 'bg-green-500 text-white' },
}

export default function PayPage() {
  const { id } = useParams()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [method, setMethod] = useState('alipay')
  const [urls, setUrls] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Object.entries(METHODS).forEach(([key, m]) => {
      signedUrl('grab-pay', m.file)
        .then(url => setUrls(u => ({ ...u, [key]: url })))
        .catch(() => setUrls(u => ({ ...u, [key]: null })))
    })
  }, [])

  async function paid() {
    setBusy(true)
    setError('')
    try {
      await markPaid(id, currentUser.uid)
      navigate(`/grab/event/${id}`, { replace: true })
    } catch {
      setError('提交失败，请重试')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={`/grab/event/${id}`} className="text-gray-400 text-xl px-2">‹</Link>
        <h1 className="text-xl font-bold">自愿支付帮带费</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
        <div className="text-3xl">☕</div>
        <div className="text-base text-gray-700 mt-1">自愿支付帮带费，不支付也没关系</div>
        <div className="flex gap-2 justify-center my-4">
          {Object.entries(METHODS).map(([key, m]) => (
            <button key={key} onClick={() => setMethod(key)}
              className={`px-6 py-2.5 rounded-full text-base font-medium ${method === key ? m.active : 'bg-gray-100 text-gray-600'}`}>
              {m.label}
            </button>
          ))}
        </div>
        {urls[method] ? (
          <img src={urls[method]} alt={`${METHODS[method].label}收款码`} className="w-full max-w-xs mx-auto rounded-xl" />
        ) : urls[method] === null ? (
          <p className="text-sm text-red-500 py-8">收款码加载失败</p>
        ) : (
          <p className="text-sm text-gray-400 py-8">加载中…</p>
        )}
        <p className="text-xs text-gray-400 mt-3">长按二维码保存，再用{METHODS[method].label}扫一扫</p>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button disabled={busy} onClick={paid} className="w-full bg-amber-500 active:bg-amber-600 disabled:opacity-50 text-white text-lg font-semibold rounded-2xl py-3.5">
        我已支付
      </button>
      <Link to={`/grab/event/${id}`} replace className="block text-center text-gray-400 py-2">下次再说</Link>
    </div>
  )
}
