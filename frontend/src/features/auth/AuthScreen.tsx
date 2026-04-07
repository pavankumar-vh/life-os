'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store'
import { getApiBaseUrl } from '@/lib/api'
import { toast } from '@/components/Toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Eye, EyeOff, Mail, CheckCircle, Sparkles, Shield, Cpu } from 'lucide-react'

const API_URL = getApiBaseUrl()

type Mode = 'login' | 'register' | 'forgot'

function PasswordStrength({ password }: { password: string }) {
  const score = password.length >= 16 ? 3 : password.length >= 10 ? 2 : password.length >= 8 ? 1 : 0
  const labels = ['', 'Weak', 'Good', 'Strong']
  const colors = ['', '#f87171', '#e8d5b7', '#4ade80']
  if (!password) return null
  return (
    <div className="flex items-center gap-2 mt-1.5 px-0.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-0.5 flex-1 rounded-full transition-all duration-500"
            style={{ background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <span className="text-[10px] transition-colors" style={{ color: colors[score] }}>{labels[score]}</span>
    </div>
  )
}

const features = [
  { icon: Cpu, label: 'AI-powered insights across all your data' },
  { icon: Shield, label: 'End-to-end encrypted — your keys, your data' },
  { icon: Sparkles, label: 'Habits, goals, workouts, diet and more' },
]

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const { login, register, isLoading } = useAuthStore()

  const reset = () => { setError(''); setForgotSent(false); setPassword(''); setConfirm(''); setName('') }
  const switchMode = (m: Mode) => { setMode(m); reset() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'register') {
        if (password !== confirm) { setError('Passwords do not match'); return }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return }
        await register(name, email, password)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setForgotLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setForgotSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google/url`)
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to initialize Google Login')
      }
    } catch (e) {
      console.error(e)
      toast.error('Network error starting Google Login')
    }
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#070709' }}>

      {/* ── Left panel (decorative, hidden on mobile) ─────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] xl:w-[42%] relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(160deg, #0f0e10 0%, #0a090c 100%)' }}>

        {/* Ambient glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-[120px] pointer-events-none"
          style={{ background: 'rgba(232,213,183,0.07)' }} />
        <div className="absolute bottom-1/3 right-0 w-56 h-56 rounded-full blur-[100px] pointer-events-none"
          style={{ background: 'rgba(201,168,124,0.05)' }} />

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Top logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(232,213,183,0.12)', border: '1px solid rgba(232,213,183,0.18)' }}>
            <Zap className="w-4 h-4 text-accent" />
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight">LifeOS</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-bold text-text-primary leading-tight tracking-tight mb-4">
              Your life,<br />
              <span style={{ background: 'linear-gradient(135deg, #e8d5b7, #c9a87c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                optimized.
              </span>
            </h2>
            <p className="text-text-muted text-sm leading-relaxed max-w-xs">
              One place for habits, fitness, nutrition, goals, notes, projects — and an AI that knows all of it.
            </p>
          </div>
          <div className="space-y-4">
            {features.map(({ icon: Icon, label }, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.5 }}
                className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                  style={{ background: 'rgba(232,213,183,0.08)', border: '1px solid rgba(232,213,183,0.1)' }}>
                  <Icon className="w-3.5 h-3.5 text-accent/70" />
                </div>
                <span className="text-sm text-text-muted">{label}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <p className="relative z-10 text-[11px] text-text-muted/40 tracking-widest uppercase">
          Built for those who track everything
        </p>
      </div>

      {/* ── Right panel — Auth card ───────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 60% 40%, rgba(232,213,183,0.025) 0%, transparent 65%)' }}>

        {/* Mobile logo */}
        <div className="absolute top-8 left-0 right-0 flex justify-center lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(232,213,183,0.12)', border: '1px solid rgba(232,213,183,0.18)' }}>
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <span className="text-base font-bold text-text-primary">LifeOS</span>
          </div>
        </div>

        <motion.div className="w-full max-w-[380px]"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

          {/* Header text */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div key={mode}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}>
                <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-1">
                  {mode === 'login' && 'Welcome back'}
                  {mode === 'register' && 'Create your account'}
                  {mode === 'forgot' && 'Forgot password?'}
                </h1>
                <p className="text-sm text-text-muted">
                  {mode === 'login' && 'Sign in to your LifeOS account'}
                  {mode === 'register' && 'Start tracking everything that matters'}
                  {mode === 'forgot' && "We'll send you a reset link"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-6"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset, 0 24px 64px -16px rgba(0,0,0,0.7)',
            }}>

            <AnimatePresence mode="wait">

              {/* ── FORGOT PASSWORD ──────────────────────────── */}
              {mode === 'forgot' && (
                <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {forgotSent ? (
                    <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <p className="text-sm font-semibold text-text-primary mb-2">Check your inbox</p>
                      <p className="text-xs text-text-muted leading-relaxed">
                        A reset link was sent to <strong className="text-text-secondary">{email}</strong>.
                        <br />It expires in 30 minutes.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleForgot} className="space-y-3">
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Mail className="w-4 h-4 text-text-muted/50" />
                        </div>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="Enter your email" required
                          className="input w-full !pl-10" />
                      </div>
                      {error && <ErrorBox msg={error} />}
                      <button type="submit" disabled={forgotLoading} className="btn w-full py-3 text-sm">
                        {forgotLoading ? <Spinner /> : 'Send Reset Link'}
                      </button>
                    </form>
                  )}

                  <div className="mt-4 pt-4 border-t border-white/[0.06] text-center">
                    <button onClick={() => switchMode('login')}
                      className="text-xs text-text-muted hover:text-accent transition-colors cursor-pointer">
                      ← Back to login
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── LOGIN / REGISTER ─────────────────────────── */}
              {mode !== 'forgot' && (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Tab switcher */}
                  <div className="flex mb-6 rounded-xl p-1"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {(['login', 'register'] as const).map(tab => (
                      <button key={tab} onClick={() => switchMode(tab)}
                        className="flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all duration-200 cursor-pointer relative"
                        style={mode === tab ? {
                          background: 'rgba(232,213,183,0.12)',
                          color: '#e8d5b7',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        } : { color: 'rgba(255,255,255,0.35)' }}>
                        {tab === 'login' ? 'Login' : 'Register'}
                      </button>
                    ))}
                  </div>

                  {/* Google OAuth */}
                  <motion.button type="button" onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl mb-4 text-sm text-text-primary transition-all cursor-pointer"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                    whileHover={{ background: 'rgba(255,255,255,0.085)' }} whileTap={{ scale: 0.99 }}>
                    <GoogleIcon />
                    Continue with Google
                  </motion.button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <AnimatePresence>
                      {mode === 'register' && (
                        <motion.div initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                          animate={{ height: 'auto', opacity: 1, marginBottom: 0 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <input type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder="Full name" required={mode === 'register'}
                            className="input w-full" autoComplete="name" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Email address" required className="input w-full" autoComplete="email" />

                    <div className="space-y-2.5">
                      {/* Password */}
                      <div className="relative">
                        <input type={showPass ? 'text' : 'password'} value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder={mode === 'register' ? 'Password (min 8 chars)' : 'Password'}
                          required minLength={mode === 'register' ? 8 : 6}
                          className="input w-full !pr-10" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                        <button type="button" onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-muted transition-colors">
                          {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {mode === 'register' && <PasswordStrength password={password} />}

                      {/* Confirm password — register only */}
                      <AnimatePresence>
                        {mode === 'register' && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="relative">
                              <input type={showConfirm ? 'text' : 'password'} value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                placeholder="Confirm password"
                                required={mode === 'register'}
                                className={`input w-full !pr-10 transition-colors ${
                                  confirm && password !== confirm ? '!border-red-500/40 !focus:border-red-500/60' : ''
                                }`}
                                autoComplete="new-password" />
                              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted/50 hover:text-text-muted transition-colors">
                                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              {/* Match indicator */}
                              {confirm && (
                                <div className="absolute right-9 top-1/2 -translate-y-1/2">
                                  {password === confirm
                                    ? <span className="text-green-400 text-[10px] font-medium">✓</span>
                                    : <span className="text-red-400 text-[10px]">✗</span>}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Forgot link — login only */}
                      {mode === 'login' && (
                        <div className="flex justify-end">
                          <button type="button" onClick={() => switchMode('forgot')}
                            className="text-[11px] text-text-muted/50 hover:text-accent transition-colors cursor-pointer">
                            Forgot password?
                          </button>
                        </div>
                      )}
                    </div>

                    {error && <ErrorBox msg={error} />}

                    <motion.button type="submit" disabled={isLoading}
                      className="btn w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-1"
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      {isLoading ? <Spinner /> : (
                        <>
                          {mode === 'login' ? 'Enter LifeOS' : 'Create Account'}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Subtext */}
          <div className="flex flex-col items-center mt-5 gap-3">
            <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {mode === 'register'
                ? 'By creating an account you agree to our terms of service'
                : 'Welcome back to your command center'}
            </p>
            <div className="flex items-center gap-4 text-[10px] text-text-muted/60">
              <a href="/privacy" className="hover:text-accent transition-colors" target="_blank">Privacy Policy</a>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <a href="/terms" className="hover:text-accent transition-colors" target="_blank">Terms of Service</a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <motion.div className="w-4 h-4 border-2 rounded-full"
      style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#1a1a1a' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="text-xs px-3.5 py-2.5 rounded-xl"
      style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.18)', color: '#fca5a5' }}>
      {msg}
    </motion.div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087C16.6582 14.254 17.64 11.9395 17.64 9.2045z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1804l-2.9087-2.2581c-.8059.5409-1.8368.8618-3.0477.8618-2.3441 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.5409-.2827-1.1182-.2827-1.71s.1027-1.1691.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  )
}
