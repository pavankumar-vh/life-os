import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, KeyRound, ShieldCheck, X } from 'lucide-react'
import { toast } from '@/components/Toast'
import { fetchApi } from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onUnlocked: (token: string) => void
  token: string | null
}

export function PrivateZoneModal({ isOpen, onClose, onUnlocked, token }: Props) {
  const [mode, setMode] = useState<'unlock' | 'setup' | 'recovery_codes' | 'recover'>('unlock')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const jwt = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null
  const authHeaders = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }

  if (!isOpen) return null

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetchApi('/api/vault/private/unlock', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ password })
      })
      if (!res.ok) {
        const err = await res.json()
        if (err.error === 'Private Zone not set up') {
          setMode('setup')
          return
        }
        throw new Error(err.error || 'Failed to unlock')
      }
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
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ password: newPassword })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      setRecoveryCodes(data.recoveryCodes)
      onUnlocked(data.token)
      setMode('recovery_codes')
      toast.success('Private Zone configured')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
      setNewPassword('')
    }
  }

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) return toast.error('Password must be 8+ characters')
    setLoading(true)
    try {
      const res = await fetchApi('/api/vault/private/recover', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ recoveryCode, newPassword })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const data = await res.json()
      onUnlocked(data.token)
      toast.success('Password reset successfully')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
      setRecoveryCode('')
      setNewPassword('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-bg-elevated border border-border rounded-xl w-full max-w-sm overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-primary">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4 mx-auto text-accent">
            {mode === 'setup' ? <ShieldCheck className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          
          <h2 className="text-xl font-medium text-text-primary text-center mb-1">
            {mode === 'unlock' ? 'Unlock Private Zone' : mode === 'setup' ? 'Setup Private Zone' : mode === 'recovery_codes' ? 'Recovery Codes' : 'Recover Access'}
          </h2>
          <p className="text-xs text-text-muted text-center mb-6">
            {mode === 'unlock' ? 'Enter your Private Zone password to continue.' : mode === 'setup' ? 'Create a separate secure password for your Private Zone.' : mode === 'recovery_codes' ? 'Save these codes safely. You will need them if you forget your password.' : 'Enter a recovery code to reset your Private Zone password.'}
          </p>

          {mode === 'unlock' && (
            <form onSubmit={handleUnlock} className="space-y-4">
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input w-full" autoFocus required />
              <button type="submit" disabled={loading || !password} className="btn w-full justify-center disabled:opacity-50">
                {loading ? 'Unlocking...' : 'Unlock'}
              </button>
              <button type="button" onClick={() => setMode('recover')} className="w-full text-xs text-text-muted hover:text-text-primary mt-4">
                Forgot password?
              </button>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <input type="password" placeholder="New Password (min 8 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input w-full" autoFocus required minLength={8} />
              <button type="submit" disabled={loading || newPassword.length < 8} className="btn w-full justify-center disabled:opacity-50">
                {loading ? 'Setting up...' : 'Setup Private Zone'}
              </button>
            </form>
          )}

          {mode === 'recovery_codes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-black/20 p-4 rounded-lg font-mono text-xs text-center text-emerald-400">
                {recoveryCodes.map(code => <div key={code}>{code}</div>)}
              </div>
              <button onClick={() => { setMode('unlock'); onClose() }} className="btn w-full justify-center">
                I have saved these safely
              </button>
            </div>
          )}

          {mode === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <input type="text" placeholder="Recovery Code (e.g. 1a2b3c4d)" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="input w-full font-mono" autoFocus required />
              <input type="password" placeholder="New Password (min 8 chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input w-full" required minLength={8} />
              <button type="submit" disabled={loading || !recoveryCode || newPassword.length < 8} className="btn w-full justify-center disabled:opacity-50">
                {loading ? 'Recovering...' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setMode('unlock')} className="w-full text-xs text-text-muted hover:text-text-primary mt-4">
                Back to unlock
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  )
}
