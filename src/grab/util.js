import { format } from 'date-fns'

export const TYPES = {
  pickup: { emoji: '☕', label: '我要去瑞幸，可以帮带' },
  group_order: { emoji: '🧋', label: '我们一起点外卖' },
}

// Status is derived from the deadline so no cron job is needed to close events.
export function effectiveStatus(event) {
  if (event.status === 'completed') return 'completed'
  if (event.status === 'closed' || new Date(event.deadline) <= new Date()) return 'closed'
  return 'open'
}

export const PICKUP_STORE = '仙居大路店（No.A14724）'
export const PICKUP_ADDRESS = '浙江省台州市仙居县福应街道大路村路南样品放53-6'
export const DELIVERY_APPS = ['淘宝闪购', '美团外卖', '京东外卖']

// Amap (高德地图) search link; opens the Amap app on phones.
export const mapUrl = (address) => `https://uri.amap.com/search?keyword=${encodeURIComponent(address)}&src=grab`

export const STATUS_LABEL = { open: '报名中', closed: '已截止', completed: '已完成' }

export const fmtTime = (iso) => format(new Date(iso), 'HH:mm')
export const fmtDateTime = (iso) => format(new Date(iso), 'M月d日 HH:mm')

// Value for <input type="datetime-local"> some minutes from now.
export function defaultLocalTime(minutes) {
  return format(new Date(Date.now() + minutes * 60000), "yyyy-MM-dd'T'HH:mm")
}

// ISO timestamp -> value for <input type="datetime-local">.
export const toLocalInput = (iso) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
