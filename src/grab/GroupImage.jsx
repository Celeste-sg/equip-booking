import { useEffect, useState } from 'react'
import { clearGroupImage, setGroupImage, signedUrl } from './api'

// Group QR for communication. Everyone sees it; only the organiser can upload / replace / remove.
export default function GroupImage({ event, path, userId, canEdit, onChanged }) {
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setUrl(null)
    if (path) signedUrl('grab-group', path).then(setUrl).catch(() => setUrl(null))
  }, [path])

  async function upload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      await setGroupImage(userId, event.id, file, path)
      onChanged()
    } catch (err) {
      setError(`上传失败：${err.message || err}`)
    }
    setBusy(false)
  }

  async function remove() {
    setBusy(true)
    setError('')
    try {
      await clearGroupImage(event.id, path)
      onChanged()
    } catch (err) {
      setError(`删除失败：${err.message || err}`)
    }
    setBusy(false)
  }

  if (!path && !canEdit) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
      <div className="text-sm font-semibold text-gray-500">💬 群二维码</div>
      {path && (
        <div className="text-center">
          {url ? <img src={url} alt="群二维码" className="w-full max-w-xs mx-auto rounded-xl" /> : <p className="text-sm text-gray-400 py-6">加载中…</p>}
          <p className="text-xs text-gray-400 mt-2">扫码进群，方便沟通</p>
        </div>
      )}
      {canEdit && (
        <div className="flex gap-3">
          <label className="flex-1 text-center border-2 border-dashed border-amber-300 rounded-2xl py-3 text-sm text-amber-600 active:bg-amber-50">
            {busy ? '上传中…' : path ? '更换群图片' : '📷 上传群图片'}
            <input type="file" accept="image/*" className="hidden" disabled={busy}
              onChange={(e) => { upload(e.target.files[0]); e.target.value = '' }} />
          </label>
          {path && (
            <button disabled={busy} onClick={remove} className="px-4 rounded-2xl border border-red-300 text-red-500 text-sm active:bg-red-50 disabled:opacity-50">
              移除
            </button>
          )}
        </div>
      )}
      {!path && canEdit && <p className="text-xs text-gray-400">上传微信群二维码，参加的人可以扫码进群沟通。</p>}
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  )
}
