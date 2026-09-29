export const PRESET_START = {
  name: '강남역',
  latitude: 37.4979,
  longitude: 127.0276,
}

export interface TravelTimeResult {
  minutes: number
  distanceKm: number
  destination: string
  latitude: number
  longitude: number
}

interface GeocodingResult {
  lat: string
  lon: string
  display_name: string
}

const CACHE_KEY = 'travel-time-cache-v2'

function readCache(): Record<string, TravelTimeResult> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeCache(cache: Record<string, TravelTimeResult>) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function formatTravelTime(result: TravelTimeResult | null | undefined) {
  if (!result) return ''
  const hours = Math.floor(result.minutes / 60)
  const minutes = result.minutes % 60
  const duration = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`
  return `이동 예상 ${duration} · ${result.distanceKm.toFixed(1)}km`
}

export async function calculateTravelTime(address: string): Promise<TravelTimeResult> {
  const normalizedAddress = address.trim()
  if (!normalizedAddress) throw new Error('목적지 주소가 없습니다.')

  const cache = readCache()
  if (cache[normalizedAddress]) return cache[normalizedAddress]

  const geocodeResponse = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&q=${encodeURIComponent(normalizedAddress)}`
  )
  if (!geocodeResponse.ok) throw new Error(`목적지 위치 조회 실패 (${geocodeResponse.status})`)

  const places = await geocodeResponse.json() as GeocodingResult[]
  const place = places[0]
  if (!place) throw new Error('목적지 위치를 찾지 못했습니다.')

  const start = `${PRESET_START.longitude},${PRESET_START.latitude}`
  const destination = `${place.lon},${place.lat}`
  const routeResponse = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${start};${destination}?overview=false`
  )
  if (!routeResponse.ok) throw new Error(`이동시간 조회 실패 (${routeResponse.status})`)

  const route = await routeResponse.json() as {
    code?: string
    routes?: Array<{ duration: number; distance: number }>
  }
  const firstRoute = route.routes?.[0]
  if (route.code !== 'Ok' || !firstRoute) throw new Error('도로 경로를 찾지 못했습니다.')

  const result: TravelTimeResult = {
    minutes: Math.max(1, Math.ceil(firstRoute.duration / 60)),
    distanceKm: firstRoute.distance / 1000,
    destination: place.display_name,
    latitude: Number(place.lat),
    longitude: Number(place.lon),
  }
  cache[normalizedAddress] = result
  writeCache(cache)
  return result
}
