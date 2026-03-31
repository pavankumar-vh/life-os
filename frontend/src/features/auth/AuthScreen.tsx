'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Sparkles } from 'lucide-react'

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('demo@lifeos.dev')
  const [password, setPassword] = useState('demo123')
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
