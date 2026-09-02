import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface BookingFormProps {
  onSuccess?: () => void
}

interface AddressValidation {
  isValid: boolean
  message: string
}

export default function BookingForm({ onSuccess }: BookingFormProps) {
  const [formData, setFormData] = useState({
    customer: '',
    service: '',
    date: '',
    time: '',
    address: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [addressValidation, setAddressValidation] = useState<AddressValidation | null>(null)
  const [validatingAddress, setValidatingAddress] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)

    if (name === 'address') {
      if (value.trim() === '') {
        setAddressValidation(null)
      } else {
        validateAddress(value)
      }
    }
  }

  const validateAddress = async (addr: string) => {
    if (!addr.trim()) {
      setAddressValidation(null)
      return
    }

    setValidatingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`
      )

      if (!response.ok) {
        setAddressValidation({
          isValid: false,
          message: 'API 요청 실패',
        })
        return
      }

      const data = await response.json()
      if (data && data.length > 0) {
        setAddressValidation({
          isValid: true,
          message: '주소를 찾았습니다 ✓',
        })
      } else {
        setAddressValidation({
          isValid: false,
          message: '주소를 찾을 수 없습니다',
        })
      }
    } catch (err) {
      setAddressValidation({
        isValid: false,
        message: '주소 검증 실패',
      })
    } finally {
      setValidatingAddress(false)
    }
  }

  const sendSlackNotification = async (bookingData: {
    customer: string
    service: string
    date: string
    time: string
    address: string
    latitude?: number
    longitude?: number
    }) => {
      try {
        const { error } = await supabase.functions.invoke('send-slack-notification', {
          body: bookingData,
        })

        if (error) {
          throw error
        }
      } catch (err) {
        console.error('Slack notification failed:', err)
      }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (
      !formData.customer ||
      !formData.service ||
      !formData.date ||
      !formData.time
    ) {
      setError('고객사, 서비스, 날짜, 시간은 필수입니다')
      return
    }

    setLoading(true)

    try {
      let latitude: number | undefined
      let longitude: number | undefined

      // If address is provided, fetch coordinates
      if (formData.address.trim()) {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.address)}&format=json&limit=1`
        )
        const data = await response.json()
        if (data && data.length > 0) {
          latitude = parseFloat(data[0].lat)
          longitude = parseFloat(data[0].lon)
        }
      }

      const { error: insertError } = await supabase
        .from('bookings')
        .insert([
          {
            customer: formData.customer,
            service: formData.service,
            date: formData.date,
            time: formData.time,
            address: formData.address || '',
            latitude,
            longitude,
            status: 'pending',
            via: 'form',
          },
        ])

      if (insertError) throw insertError

      // Send Slack notification
      await sendSlackNotification({
        customer: formData.customer,
        service: formData.service,
        date: formData.date,
        time: formData.time,
        address: formData.address,
        latitude,
        longitude,
      })

      // Reset form
      setFormData({
        customer: '',
        service: '',
        date: '',
        time: '',
        address: '',
      })
      setAddressValidation(null)

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '예약 추가에 실패했습니다'
      setError(message)
      console.error('Error inserting booking:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 bg-white rounded-lg shadow-md"
    >
      <h2 className="mb-4 text-lg font-semibold">새 예약 추가</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          name="customer"
          placeholder="고객사"
          value={formData.customer}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        <input
          type="text"
          name="service"
          placeholder="서비스"
          value={formData.service}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        <input
          type="time"
          name="time"
          value={formData.time}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        <div className="md:col-span-2">
          <input
            type="text"
            name="address"
            placeholder="주소 (선택)"
            value={formData.address}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded focus:outline-none ${
              formData.address.trim() === ''
                ? 'border-gray-300 focus:border-blue-500'
                : addressValidation?.isValid
                  ? 'border-green-500 focus:border-green-600'
                  : 'border-red-500 focus:border-red-600'
            }`}
          />
          {validatingAddress && (
            <p className="mt-1 text-sm text-gray-500">검증 중...</p>
          )}
          {addressValidation && !validatingAddress && (
            <p
              className={`mt-1 text-sm ${
                addressValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {addressValidation.message}
            </p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {loading ? '추가 중...' : '예약하기'}
      </button>
    </form>
  )
}
