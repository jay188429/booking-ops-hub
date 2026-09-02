import { useEffect, useState } from 'react'

interface WeatherData {
  temperature: number
  humidity: number
  weatherDescription: string
  weatherCode: number
}

interface WeatherInfoProps {
  latitude: number
  longitude: number
}

export default function WeatherInfo({ latitude, longitude }: WeatherInfoProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWeather()
  }, [latitude, longitude])

  async function fetchWeather() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch weather data')
      }

      const data = await response.json()
      const current = data.current

      setWeather({
        temperature: Math.round(current.temperature_2m * 10) / 10,
        humidity: current.relative_humidity_2m,
        weatherDescription: getWeatherDescription(current.weather_code),
        weatherCode: current.weather_code,
      })
    } catch (error) {
      console.error('Error fetching weather:', error)
      setError('날씨 정보를 불러올 수 없습니다')
    } finally {
      setLoading(false)
    }
  }

  const getWeatherDescription = (code: number): string => {
    // WMO Weather interpretation codes
    if (code === 0) return '맑음'
    if (code === 1) return '대체로 맑음'
    if (code === 2) return '부분 흐림'
    if (code === 3) return '흐림'
    if (code === 45) return '안개'
    if (code === 48) return '서리 낀 안개'
    if (code === 51 || code === 53 || code === 55) return '이슬비'
    if (code === 61 || code === 63 || code === 65) return '비'
    if (code === 71 || code === 73 || code === 75) return '눈'
    if (code === 77) return '눈 입자'
    if (code === 80 || code === 81 || code === 82) return '소나기'
    if (code === 85 || code === 86) return '눈 소나기'
    if (code === 95 || code === 96 || code === 99) return '뇌우'
    return '알 수 없음'
  }

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes
    if (code === 0) return '☀️' // Clear sky
    if (code === 1 || code === 2) return '🌤️' // Mainly clear
    if (code === 3) return '☁️' // Overcast
    if (code === 45 || code === 48) return '🌫️' // Foggy
    if (code === 51 || code === 53 || code === 55) return '🌧️' // Drizzle
    if (code === 61 || code === 63 || code === 65) return '🌧️' // Rain
    if (code === 71 || code === 73 || code === 75) return '❄️' // Snow
    if (code === 77) return '❄️' // Snow grains
    if (code === 80 || code === 81 || code === 82) return '🌧️' // Rain showers
    if (code === 85 || code === 86) return '❄️' // Snow showers
    if (code === 95 || code === 96 || code === 99) return '⛈️' // Thunderstorm
    return '🌡️' // Default
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <span>로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-500">
        <span>{error}</span>
      </div>
    )
  }

  if (!weather) {
    return <div className="text-xs text-gray-400">-</div>
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        <span>{getWeatherIcon(weather.weatherCode)}</span>
        <span className="font-medium text-gray-800">{weather.temperature}°C</span>
      </div>
      <div className="text-gray-600">
        <span>{weather.weatherDescription}</span>
      </div>
      <div className="text-gray-500">
        <span>습도: {weather.humidity}%</span>
      </div>
    </div>
  )
}
