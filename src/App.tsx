import { useState, useEffect } from 'react'
import BookingForm from './components/BookingForm'
import BookingTable from './components/BookingTable'
import StatCards from './components/StatCards'
import LoginPage from './components/LoginPage'
import { onAuthStateChange, signOut } from './lib/supabase'

type TabType = '대시보드' | '예약목록' | '예약추가' | '상태관리' | '위치확인'

const TABS: TabType[] = ['대시보드', '예약목록', '예약추가', '상태관리', '위치확인']

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('대시보드')
  const [refreshKey, setRefreshKey] = useState(0)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  useEffect(() => {
    const { data: subscription } = onAuthStateChange((session) => {
      setSession(session)

      // 이메일 검증
      if (session?.user?.email === adminEmail) {
        setIsAuthorized(true)
      } else {
        setIsAuthorized(false)
      }

      setLoading(false)
    })

    return () => {
      subscription?.subscription.unsubscribe()
    }
  }, [adminEmail])

  const handleSignOut = async () => {
    try {
      await signOut()
      setSession(null)
      setIsAuthorized(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">로드 중...</p>
        </div>
      </div>
    )
  }

  if (!session || !isAuthorized) {
    return <LoginPage />
  }

  const handleFormSuccess = () => {
    setRefreshKey((prev) => prev + 1)
    // 예약추가 완료 후 자동으로 예약목록 탭으로 이동
    setActiveTab('예약목록')
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case '대시보드':
        return (
          <div className="pb-20">
            <StatCards refreshKey={refreshKey} />
          </div>
        )
      case '예약목록':
        return (
          <div className="pb-20">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">예약 목록</h2>
              <BookingTable refreshKey={refreshKey} />
            </div>
          </div>
        )
      case '예약추가':
        return (
          <div className="pb-20">
            <BookingForm onSuccess={handleFormSuccess} />
          </div>
        )
      case '상태관리':
        return (
          <div className="pb-20">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">상태 관리</h2>
              <p className="text-gray-600 mb-4">아래에서 각 예약의 상태를 변경할 수 있습니다. 상태 버튼을 클릭하여 대기중/확정 상태를 토글할 수 있습니다.</p>
              <BookingTable refreshKey={refreshKey} />
            </div>
          </div>
        )
      case '위치확인':
        return (
          <div className="pb-20">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">위치 확인</h2>
              <p className="text-gray-600 mb-4">주소 컬럼의 링크를 클릭하면 Google Maps에서 위치를 확인할 수 있습니다.</p>
              <BookingTable refreshKey={refreshKey} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 제목 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto py-6 px-4 md:py-8 md:px-4 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-gray-800">예약 관리 허브</h1>
          <div className="flex items-center gap-4">
            {session?.user?.email && (
              <span className="text-sm text-gray-600">{session.user.email}</span>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {renderTabContent()}
      </div>

      {/* 하단 탭 바 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 h-full flex items-center justify-center text-center px-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <span className="text-sm md:text-base">{tab}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
