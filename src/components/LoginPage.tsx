import { useState, useEffect } from 'react'
import { signInWithGoogle, getSession, signOut } from '../lib/supabase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentSession = await getSession()
        if (currentSession?.user?.email) {
          setSession(currentSession)
          // 현재 로그인 상태가 있으면 이메일 검증
          if (currentSession.user.email !== adminEmail) {
            setError('관리자만 접근 가능합니다')
          }
        }
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        setCheckingAuth(false)
      }
    }
    checkSession()
  }, [adminEmail])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Google 로그인에 실패했습니다'
      setError(message)
      console.error('Google sign in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setSession(null)
      setError(null)
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              예약 관리 허브
            </h1>
            <p className="text-gray-600">예약을 효율적으로 관리하세요</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-800 rounded-lg">
              <p className="font-medium">{error}</p>
              {session && (
                <p className="text-sm mt-2">
                  현재 이메일: <strong>{session.user.email}</strong>
                </p>
              )}
            </div>
          )}

          {/* Google Sign In Button or Logout Button */}
          {!session || error ? (
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors font-medium text-gray-800"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
              {loading ? '로그인 중...' : 'Google로 로그인'}
            </button>
          ) : null}

          {/* Logout Button when error exists */}
          {session && error && (
            <button
              onClick={handleSignOut}
              className="w-full mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              다른 계정으로 로그인
            </button>
          )}

          {/* Info Text */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Google 계정으로 안전하게 로그인하세요.
            <br />
            처음 방문이신가요? 자동으로 가입됩니다.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © 2024 예약 관리 허브. 모든 권리 보유.
        </p>
      </div>
    </div>
  )
}
