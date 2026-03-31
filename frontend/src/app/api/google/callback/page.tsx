'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export default function GoogleCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Connecting Google account...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setMessage(`Google auth failed: ${error}`)
      return
    }

    if (!code) {
      setStatus('error')
      setMessage('No authorization code received')
      return
    }

    const token = localStorage.getItem('lifeos-token')
    if (!token) {
      setStatus('error')
      setMessage('Not logged in. Please log in first.')
      return
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    fetch(`${apiBase}/api/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ code }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.connected) {
          setStatus('success')
          setMessage('Google account connected! Redirecting...')
          setTimeout(() => { window.location.href = '/' }, 1500)
        } else {
          setStatus('error')
          setMessage(data.error || 'Failed to connect')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Failed to connect Google account')
      })
  }, [])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />}
        {status === 'success' && <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-4" />}
        {status === 'error' && <XCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />}
        <p className="text-sm text-text-primary">{message}</p>
        {status === 'error' && (
          <button onClick={() => window.location.href = '/'} className="mt-4 px-4 py-2 bg-accent/10 text-accent rounded-lg text-sm hover:bg-accent/20">
            Back to LifeOS
          </button>
        )}
      </div>
    </div>
  )
}
