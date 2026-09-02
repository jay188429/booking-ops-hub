import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

interface MapModalProps {
  address: string
  isOpen: boolean
  onClose: () => void
}

interface NominatimResult {
  lat: string
  lon: string
  address: string
}

export default function MapModal({ address, isOpen, onClose }: MapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (!address || address.trim() === '') {
      setError('주소가 비어있습니다.')
      return
    }

    const fetchCoordinates = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
        )

        if (!response.ok) {
          throw new Error(`API 요청 실패: ${response.status}`)
        }

        const data: NominatimResult[] = await response.json()

        if (!data || data.length === 0) {
          setError('주소를 찾을 수 없습니다.')
          return
        }

        const result = data[0]
        const lat = parseFloat(result.lat)
        const lon = parseFloat(result.lon)

        // Initialize map if not already done
        if (mapContainer.current && !map.current) {
          map.current = L.map(mapContainer.current).setView([lat, lon], 13)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map.current)
        }

        // Update map view and add marker
        if (map.current) {
          map.current.setView([lat, lon], 13)
          // Remove existing markers
          map.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              map.current?.removeLayer(layer)
            }
          })
          // Add new marker with pin
          L.marker([lat, lon])
            .bindPopup(`<div class="font-semibold">${address}</div>`)
            .addTo(map.current)
            .openPopup()
        }
      } catch (err) {
        console.error('Error fetching coordinates:', err)
        setError('지도를 로드하지 못했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCoordinates()
  }, [isOpen, address])

  // Cleanup function
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{address}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold transition-colors"
            aria-label="Close map"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">지도를 로드하는 중...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="h-96 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <p className="text-red-600 font-semibold mb-2">오류 발생</p>
                <p className="text-gray-600">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div
              ref={mapContainer}
              className="h-96 w-full bg-gray-100"
              id="map"
            ></div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
