'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { fetchApi } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'

async function parseResponseBody(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 300) }
  }
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  const { setToken: setAuthToken, setUser } = useAuthStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) setToken(t)
    else setError('Invalid or missing reset link.')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setStatus('loading')
    try {
      const res = await fetchApi('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await parseResponseBody(res)
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')

      // Auto-login after reset
      localStorage.setItem('lifeos-token', data.token)
      setAuthToken(data.token)
      if (data.user) setUser(data.user)

      setStatus('success')
      setTimeout(() => { window.location.href = '/' }, 1800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(232,213,183,0.04) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'rgba(232,213,183,0.1)', border: '1px solid rgba(232,213,183,0.15)', boxShadow: '0 8px 32px -4px rgba(232,213,183,0.2)' }}>
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">LifeOS</h1>
        </div>

        <div className="rounded-2xl p-7 glow-card"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 48px -12px rgba(0,0,0,0.6)' }}>

          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div key="success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-green-400" />
                </div>
                <h2 className="text-base font-semibold text-text-primary mb-1">Password reset!</h2>
                <p className="text-xs text-text-muted">Logging you in...</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">Set new password</h2>
                    <p className="text-[10px] text-text-muted">Must be at least 8 characters</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="New password"
                      required minLength={8}
                      className="input w-full !pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    required minLength={8}
                    className="input w-full"
                  />

                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-xs rounded-xl px-4 py-2.5"
                        style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.15)' }}>
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Strength indicator */}
                  {password && (
                    <div className="flex gap-1">
                      {[8, 12, 16].map((len, i) => (
                        <div key={i} className="h-0.5 flex-1 rounded-full transition-colors"
                          style={{ background: password.length >= len ? (i === 2 ? '#4ade80' : i === 1 ? '#e8d5b7' : '#f87171') : 'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                  )}

                  <motion.button type="submit" disabled={status === 'loading' || !token}
                    className="btn w-full py-3 text-sm mt-1"
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    {status === 'loading' ? (
                      <motion.div className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full"
                        animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
                    ) : 'Reset Password'}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="text-center mt-5">
          <a href="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors">
            <ArrowLeft size={12} /> Back to login
          </a>
        </div>
      </motion.div>
    </div>
  )
}
