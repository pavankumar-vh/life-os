'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brutal-yellow border-3 border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center">
              <Zap className="w-6 h-6 text-black" />
            </div>
          </div>
          <h1 className="font-display text-4xl font-black tracking-tight">LifeOS</h1>
          <p className="text-text-muted font-mono text-sm mt-2">Your personal command center</p>
        </div>

        {/* Form */}
        <div className="border-3 border-text-primary bg-bg-surface shadow-brutal-white p-6">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 font-mono text-sm uppercase tracking-wider border-b-3 transition-colors ${
                isLogin ? 'border-brutal-yellow text-brutal-yellow' : 'border-border text-text-muted'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 font-mono text-sm uppercase tracking-wider border-b-3 transition-colors ${
                !isLogin ? 'border-brutal-yellow text-brutal-yellow' : 'border-border text-text-muted'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                required={!isLogin}
                className="brutal-input w-full"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="brutal-input w-full"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="brutal-input w-full"
            />

            {error && (
              <p className="text-brutal-red font-mono text-xs border-2 border-brutal-red p-2">{error}</p>
            )}

            <button type="submit" disabled={isLoading} className="brutal-btn w-full">
              {isLoading ? 'Loading...' : isLogin ? 'Enter LifeOS' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted font-mono text-[10px] mt-4 uppercase tracking-widest">
          Built for those who track everything
        </p>
      </motion.div>
    </div>
  )
}
