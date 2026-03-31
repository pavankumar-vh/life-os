'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ListChecks, StickyNote, Zap, Droplets, X } from 'lucide-react'
import { useTasksStore, useNotesStore, useCaptureStore, useWaterStore } from '@/store'

type QuickType = 'task' | 'note' | 'capture' | 'water'

const TYPES: { id: QuickType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { id: 'task', label: 'Task', icon: <ListChecks size={14} />, placeholder: 'Add a task...' },
  { id: 'note', label: 'Note', icon: <StickyNote size={14} />, placeholder: 'Quick note...' },
  { id: 'capture', label: 'Idea', icon: <Zap size={14} />, placeholder: 'Capture an idea...' },
  { id: 'water', label: 'Water', icon: <Droplets size={14} />, placeholder: 'Glasses of water (e.g. 2)...' },
]

export function QuickAddBar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<QuickType>('task')
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { addTask } = useTasksStore()
  const { saveNote } = useNotesStore()
  const { addCapture } = useCaptureStore()
  const { logWater } = useWaterStore()

  useEffect(() => {
    if (open) {
      setValue('')
      setType('task')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    const text = value.trim()
    if (!text) return

    switch (type) {
      case 'task':
        await addTask({ title: text, status: 'todo', priority: 'medium' })
        break
      case 'note':
        await saveNote({ title: text, content: '' })
        break
      case 'capture':
        await addCapture({ text, type: 'idea' })
        break
      case 'water': {
        const glasses = parseInt(text, 10) || 1
        await logWater({ glasses, date: new Date().toISOString().split('T')[0] })
        break
      }
    }

    setValue('')
    onClose()
  }, [value, type, addTask, saveNote, addCapture, logWater, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
    // Tab cycles through types
    if (e.key === 'Tab') {
      e.preventDefault()
      const idx = TYPES.findIndex(t => t.id === type)
      setType(TYPES[(idx + 1) % TYPES.length].id)
    }
  }, [handleSubmit, onClose, type])

  const currentType = TYPES.find(t => t.id === type)!

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[61] w-[90vw] max-w-lg"
          >
            <div className="card !p-0 overflow-hidden shadow-2xl border border-border-subtle">
              {/* Type Selector */}
              <div className="flex gap-1 p-2 border-b border-border-subtle bg-bg-elevated/50">
                {TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setType(t.id); inputRef.current?.focus() }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      type === t.id
                        ? 'bg-accent-warm/20 text-accent-warm'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Input */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-lg bg-accent-warm/10 flex items-center justify-center text-accent-warm shrink-0">
                  <Plus size={16} />
                </div>
                <input
                  ref={inputRef}
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={currentType.placeholder}
                  className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
                  autoComplete="off"
                />
                {value && (
                  <button
                    onClick={() => setValue('')}
                    className="text-text-muted hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {/* Hints */}
              <div className="px-3 pb-2 flex items-center gap-3 text-xs text-text-muted">
                <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated text-xs">Enter</kbd> Add</span>
                <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated text-xs">Tab</kbd> Switch type</span>
                <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated text-xs">Esc</kbd> Close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
