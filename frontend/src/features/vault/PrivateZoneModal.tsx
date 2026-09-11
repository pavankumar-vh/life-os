'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, ShieldCheck, X, Eye, EyeOff } from 'lucide-react'
import { toast } from '@/components/Toast'
import { fetchApi } from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onUnlocked: (token: string) => void
}

export function PrivateZoneModal({ isOpen, onClose, onUnlocked }: Props) {
  const [mode, setMode] = useState<'checking' | 'unlock' | 'setup' | 'recovery_codes' | 'recover'>('checking')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const jwt = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null
  const authHeaders = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }

  // Check whether Private Zone is already set up whenever the modal opens
  useEffect(() => {
    if (!isOpen) return
    setMode('checking')
    setPassword('')
    setNewPassword('')
    setShowPw(false)
    fetchApi('/api/vault/private/status', { headers: { Authorization: `Bearer ${jwt}` } })
      .then(r => r.json())
      .then(d => setMode(d.isSetup ? 'unlock' : 'setup'))
      .catch(() => setMode('unlock'))
  }, [isOpen])

  if (!isOpen) return null

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetchApi('/api/vault/private/unlock', {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ password })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Wrong password')
      const data = await res.json()
      onUnlocked(data.token)
      toast.success('Private Zone unlocked')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
      setPassword('')
    }
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be 8+ characters')
    setLoading(true)
    try {
      const res = await fetchApi('/api/vault/private/setup', {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ password: newPassword })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setRecoveryCodes(data.recoveryCodes)
      onUnlocked(data.token)
      setMode('recovery_codes')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be 8+ characters')
    setLoading(true)
    try {
      const res = await fetchApi('/api/vault/private/recover', {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ recoveryCode, newPassword })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      onUnlocked(data.token)
      toast.success('Password reset successfully')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<string, string> = {
    checking: 'Loading…',
    unlock: 'Unlock Private Zone',
    setup: 'Setup Private Zone',
    recovery_codes: 'Save Recovery Codes',
    recover: 'Recover Access',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-elevated border border-border rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden"
      >
        <div className="px-6 pt-6 pb-6">
          <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: mode === 'setup' || mode === 'recovery_codes' ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)' }}>
              {mode === 'setup' || mode === 'recovery_codes'
                ? <ShieldCheck className="w-5 h-5 text-emerald-400" />
                : <Lock className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">{titles[mode]}</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                {mode === 'unlock' && 'Enter your Private Zone password'}
                {mode === 'setup' && 'First time? Create a password for Private Zone'}
                {mode === 'recovery_codes' && 'Store these somewhere safe — shown once only'}
                {mode === 'recover' && 'Use a recovery code to reset your password'}
                {mode === 'checking' && 'Checking status…'}
              </p>
            </div>
          </div>

          {/* Checking spinner */}
          {mode === 'checking' && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {/* Unlock */}
          {mode === 'unlock' && (
            <form onSubmit={handleUnlock} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input w-full pr-10"
                  autoFocus required
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button type="submit" disabled={loading || !password}
                className="btn w-full justify-center disabled:opacity-50 text-sm">
                {loading ? 'Unlocking…' : 'Unlock'}
              </button>
              <button type="button" onClick={() => setMode('recover')}
                className="w-full text-xs text-text-muted hover:text-text-primary transition-colors text-center pt-1">
                Forgot password? Use a recovery code
              </button>
            </form>
          )}

          {/* Setup */}
          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-3">
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input w-full pr-10"
                  autoFocus required minLength={8}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                This is separate from your account password. Private Zone files are never visible to search or AI.
              </p>
              <button type="submit" disabled={loading || newPassword.length < 8}
                className="btn w-full justify-center disabled:opacity-50 text-sm">
                {loading ? 'Creating…' : 'Create Private Zone'}
              </button>
            </form>
          )}

          {/* Recovery codes */}
          {mode === 'recovery_codes' && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <div className="grid grid-cols-2 gap-1.5 p-3 font-mono text-xs text-emerald-400 text-center">
                  {recoveryCodes.map(code => (
                    <div key={code} className="bg-black/30 rounded-lg py-1.5 px-2 select-all">{code}</div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-amber-400/80 text-center">
                ⚠️ These won't be shown again. Screenshot or write them down.
              </p>
              <button onClick={onClose} className="btn w-full justify-center text-sm">
                I've saved my recovery codes
              </button>
            </div>
          )}

          {/* Recover */}
          {mode === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-3">
              <input type="text" placeholder="Recovery code (e.g. a1b2c3d4)"
                value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}
                className="input w-full font-mono" autoFocus required />
              <input type="password" placeholder="New password (min 8 chars)"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="input w-full" required minLength={8} />
              <button type="submit" disabled={loading || !recoveryCode || newPassword.length < 8}
                className="btn w-full justify-center disabled:opacity-50 text-sm">
                {loading ? 'Recovering…' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setMode('unlock')}
                className="w-full text-xs text-text-muted hover:text-text-primary transition-colors text-center pt-1">
                ← Back to unlock
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
