'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Sparkles } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, register, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleGoogleSignIn = () => {
    window.location.href = `${API_URL}/api/google/auth`
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 overflow-hidden relative">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(232, 213, 183, 0.04) 0%, transparent 70%)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative"
            style={{
              background: 'rgba(232, 213, 183, 0.1)',
              border: '1px solid rgba(232, 213, 183, 0.15)',
              boxShadow: '0 8px 32px -4px rgba(232, 213, 183, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Zap className="w-6 h-6 text-accent" />
          </motion.div>

          <motion.h1
            className="text-4xl font-bold tracking-tight gradient-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            LifeOS
          </motion.h1>
          <motion.p
            className="text-text-muted text-sm mt-2 flex items-center justify-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Sparkles className="w-3.5 h-3.5 text-accent/50" />
            Your personal command center
          </motion.p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="rounded-2xl p-7 glow-card"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            boxShadow: '0 16px 48px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Tab switcher */}
          <div className="flex mb-7 relative">
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.08)] to-transparent" />
            {['Login', 'Register'].map((tab, idx) => {
              const active = idx === 0 ? isLogin : !isLogin
              return (
                <button
                  key={tab}
                  onClick={() => setIsLogin(idx === 0)}
                  className={`flex-1 pb-3 text-sm font-medium transition-all duration-300 relative ${
                    active ? 'text-accent' : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {tab}
                  {active && (
                    <motion.div
                      layoutId="auth-tab"
                      className="absolute bottom-0 left-[20%] right-[20%] h-[2px] rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #e8d5b7, transparent)',
                        boxShadow: '0 0 12px rgba(232, 213, 183, 0.3)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Google OAuth Button */}
          <motion.button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl mb-5 text-sm font-medium text-text-primary transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.09)', scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Google Logo SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087C16.6582 14.254 17.64 11.9395 17.64 9.2045z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1804l-2.9087-2.2581c-.8059.5409-1.8368.8618-3.0477.8618-2.3441 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.5409-.2827-1.1182-.2827-1.71s.1027-1.1691.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
              <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-text-muted">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    required={!isLogin}
                    className="input w-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="input w-full"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="input w-full"
            />

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="text-red-400 text-xs rounded-xl px-4 py-2.5"
                  style={{
                    background: 'rgba(251, 113, 133, 0.08)',
                    border: '1px solid rgba(251, 113, 133, 0.15)',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn w-full mt-2 text-[15px] py-3 group"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-bg/30 border-t-bg rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <>
                  {isLogin ? 'Enter LifeOS' : 'Create Account'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.p
          className="text-center text-text-muted text-xs mt-6 tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          Built for those who track everything
        </motion.p>
      </motion.div>
    </div>
  )
}

