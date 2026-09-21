import { useEffect, useState } from 'react'
import { payCodeUrl, uploadPayCode } from './api'

const METHODS = [['alipay', '支付宝'], ['wechat', '微信']]

// Shown to the pickup organiser: upload the payment codes people see when they tip.
export default function PayCodeSettings({ userId }) {
  const [urls, setUrls] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = () => Promise.all(METHODS.map(([m]) => payCodeUrl(userId, m)))
    .then(([alipay, wechat]) => setUrls({ alipay, wechat }))
  useEffect(() => { load() }, [userId])

  async function upload(method, file) {
    if (!file) return
    setBusy(method)
    setError('')
    try {
      await uploadPayCode(userId, method, file)
      await load()
    } catch (err) {
      setError(`上传失败：${err.message || err}`)
    }
    setBusy('')
  }

  if (!urls) return null
  const missing = METHODS.every(([m]) => !urls[m])

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-500">💰 我的收款码</div>
      <p className={`text-xs ${missing ? 'text-orange-500' : 'text-gray-400'}`}>
        {missing ? '还没有上传收款码，别人无法支付帮带费。' : '别人自愿支付帮带费时会看到这里的收款码。'}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {METHODS.map(([m, label]) => (
          <label key={m} className="block border-2 border-dashed border-amber-300 rounded-2xl p-2 text-center text-sm text-amber-600 active:bg-amber-50">
            {urls[m] ? <img src={urls[m]} alt={`${label}收款码`} className="w-full rounded-lg mb-1" /> : <div className="py-6">📷</div>}
            {busy === m ? '上传中…' : urls[m] ? `更换${label}码` : `上传${label}码`}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { upload(m, e.target.files[0]); e.target.value = '' }} />
          </label>
        ))}
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
