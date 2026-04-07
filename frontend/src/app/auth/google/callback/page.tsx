'use client'

import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '@/lib/api'
import { useAuthStore } from '@/store'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function AuthGoogleCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Authenticating with Google...')
  const setToken = useAuthStore(s => s.setToken)
  const setUser = useAuthStore(s => s.setUser)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setMessage(`Google auth failed: ${error}`)
      setTimeout(() => { window.location.href = '/' }, 2000)
      return
    }

    if (!code || state !== 'login') {
      setStatus('error')
      setMessage('Invalid authorization payload')
      setTimeout(() => { window.location.href = '/' }, 2000)
      return
    }

    const apiBase = getApiBaseUrl()
    fetch(`${apiBase}/api/auth/google/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.token) {
          setStatus('success')
          setMessage('Successfully logged in! Redirecting...')
          setToken(data.token)
          setUser(data.user)
          setTimeout(() => { window.location.href = '/' }, 1000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to log in')
          setTimeout(() => { window.location.href = '/' }, 2500)
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Network error during authentication')
        setTimeout(() => { window.location.href = '/' }, 2500)
      })
  }, [setToken, setUser])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="text-center max-w-xs w-full">
        <div className="mb-5">
          {status === 'loading' && (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          )}
          {status === 'error' && (
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-sm text-white/50">Google Sign In</span>
        </div>

        <p className={`text-sm font-medium ${
          status === 'success' ? 'text-green-400' :
          status === 'error' ? 'text-red-400' :
          'text-white/70'
        }`}>{message}</p>
        
        {status === 'loading' && <p className="text-xs text-white/30 mt-2">Please wait...</p>}
      </div>
    </div>
  )
}
