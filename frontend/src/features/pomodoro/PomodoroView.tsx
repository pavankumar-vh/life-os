'use client'

import { useEffect, useState } from 'react'
import { usePomodoroStore } from '@/store'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Clock, Brain, Coffee, Zap } from 'lucide-react'

export function PomodoroView() {
  const { isRunning, mode, timeLeft, sessionsToday, totalFocusMinutes, startTimer, pauseTimer, resetTimer, tick, switchMode } = usePomodoroStore()

  useEffect(() => {
    const interval = setInterval(() => { tick() }, 1000)
    return () => clearInterval(interval)
  }, [tick])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalSeconds = mode === 'focus' ? 25 * 60 : 5 * 60
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 120

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-accent" /> Focus Timer
          </h1>
          <p className="text-text-muted text-xs mt-0.5">Stay focused, take breaks</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="card text-center">
          <Zap className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-2xl font-bold text-accent">{sessionsToday}</p>
          <p className="text-xs text-text-muted">Sessions Today</p>
        </div>
        <div className="card text-center">
          <Brain className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-soft">{totalFocusMinutes}m</p>
          <p className="text-xs text-text-muted">Focus Time</p>
        </div>
        <div className="card text-center">
          <Coffee className="w-4 h-4 text-orange-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-orange-soft">{Math.round(totalFocusMinutes / 25)}</p>
          <p className="text-xs text-text-muted">Pomodoros</p>
        </div>
      </div>

      {/* Timer Circle */}
      <div className="flex flex-col items-center mb-8">
        {/* Mode Toggle */}
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 mb-8">
          <button onClick={() => switchMode('focus')}
            className={`px-6 py-2 text-sm rounded-md transition-all ${mode === 'focus' ? 'bg-bg-surface text-accent font-medium shadow-sm' : 'text-text-muted'}`}>
            <Brain className="w-4 h-4 inline mr-2" />Focus
          </button>
          <button onClick={() => switchMode('break')}
            className={`px-6 py-2 text-sm rounded-md transition-all ${mode === 'break' ? 'bg-bg-surface text-green-soft font-medium shadow-sm' : 'text-text-muted'}`}>
            <Coffee className="w-4 h-4 inline mr-2" />Break
          </button>
        </div>

        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
            {/* Background circle */}
            <circle cx="128" cy="128" r="120" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
            {/* Progress circle */}
            <motion.circle cx="128" cy="128" r="120" fill="none"
              stroke={mode === 'focus' ? '#e8d5b7' : '#4ade80'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
              initial={false}
              animate={{ strokeDashoffset: circumference - (progress / 100) * circumference }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-5xl font-bold tracking-tight ${mode === 'focus' ? 'text-accent' : 'text-green-soft'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </p>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-widest">
              {mode === 'focus' ? 'Focus Time' : 'Break Time'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button onClick={resetTimer} className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button onClick={isRunning ? pauseTimer : startTimer}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-[#1a1a1a] font-medium transition-all ${
              mode === 'focus' ? 'bg-accent hover:bg-accent-warm' : 'bg-green-soft hover:bg-green-soft/80'
            }`}>
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <div className="w-12 h-12" /> {/* Spacer for symmetry */}
        </div>
      </div>

      {/* Session History */}
      {sessionsToday > 0 && (
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3">Today&apos;s Sessions</h3>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: sessionsToday }, (_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-accent" />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-3">{sessionsToday} sessions · {totalFocusMinutes} minutes of deep focus</p>
        </div>
      )}

      {/* Tips */}
      <div className="card mt-4">
        <h3 className="text-xs font-medium text-text-muted mb-2">Pomodoro Tips</h3>
        <ul className="space-y-1.5 text-[11px] text-text-secondary">
          <li>Focus for 25 minutes, then take a 5-minute break</li>
          <li>After 4 sessions, take a longer 15-30 minute break</li>
          <li>Disable notifications during focus sessions</li>
          <li>Write down what you want to accomplish before starting</li>
        </ul>
      </div>
    </div>
  )
}
