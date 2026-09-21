import { format } from 'date-fns'

export const TYPES = {
  pickup: { emoji: '☕', label: '我要发起帮带' },
  group_order: { emoji: '🧋', label: '我要发起外卖拼单' },
}

// Status is derived from the deadline so no cron job is needed to close events.
export function effectiveStatus(event) {
  if (event.status === 'completed') return 'completed'
  if (event.status === 'closed' || new Date(event.deadline) <= new Date()) return 'closed'
  return 'open'
}

export const PICKUP_STORE = '仙居大路店（No.A14724）'
export const PICKUP_ADDRESS = '浙江省台州市仙居县福应街道大路村路南样品房53-6号'
export const DELIVERY_APPS = ['淘宝闪购', '美团外卖', '京东外卖']

// Exact Amap (高德, GCJ-02) position of the default Luckin store (POI B0LK9SAE4H).
const PICKUP_PLACE = { name: '瑞幸咖啡(仙居大路店)', lat: 28.885054879743493, lng: 120.82696750760077 }
// Older events saved the address with a typo, so match on the street part only.
const placeFor = (address) => (address.includes('大路村路南') ? PICKUP_PLACE : null)

// Amap (高德地图) web link; for the known store it marks the exact spot.
export function mapUrl(address) {
  const p = placeFor(address)
  if (p) return `https://uri.amap.com/marker?position=${p.lng},${p.lat}&name=${encodeURIComponent(p.name)}&coordinate=gaode&callnative=1&src=grab`
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(address)}&src=grab`
}

// Try to open the Amap app directly (URI scheme); fall back to the web page if the app
// doesn't take over within 1.5s. WeChat's in-app browser blocks schemes, so it goes to the web page.
export function openAmap(address) {
  const web = mapUrl(address)
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  if ((!isIOS && !isAndroid) || /MicroMessenger/i.test(ua)) {
    window.open(web, '_blank', 'noopener')
    return
  }
  const q = encodeURIComponent(address)
  const p = placeFor(address)
  const prefix = isIOS ? 'iosamap' : 'androidamap'
  const scheme = p
    ? `${prefix}://viewMap?sourceApplication=grab&poiname=${encodeURIComponent(p.name)}&lat=${p.lat}&lon=${p.lng}&dev=0`
    : isIOS
      ? `iosamap://poi?sourceApplication=grab&name=${q}`
      : `androidamap://poi?sourceApplication=grab&keywords=${q}&dev=0`
  const timer = setTimeout(() => { window.location.href = web }, 1500)
  // The page is hidden once the app opens: cancel the web fallback.
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer) }, { once: true })
  window.location.href = scheme
}

export const STATUS_LABEL = { open: '报名中', closed: '已截止', completed: '已完成' }

export const fmtTime = (iso) => format(new Date(iso), 'HH:mm')
export const fmtDateTime = (iso) => format(new Date(iso), 'M月d日 HH:mm')

// Value for <input type="datetime-local"> some minutes from now.
export function defaultLocalTime(minutes) {
  return format(new Date(Date.now() + minutes * 60000), "yyyy-MM-dd'T'HH:mm")
}

// ISO timestamp -> value for <input type="datetime-local">.
export const toLocalInput = (iso) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
