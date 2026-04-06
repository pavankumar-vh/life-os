'use client'

import { useEffect, useState, useMemo } from 'react'
import { useCaptureStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Inbox, Lightbulb, CheckSquare, Bell, Brain, Send, Check } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'

const TYPE_CONFIG = {
  thought: { icon: Brain, color: 'text-accent', bg: 'bg-accent/10', label: 'Thought' },
  idea: { icon: Lightbulb, color: 'text-green-soft', bg: 'bg-green-soft/10', label: 'Idea' },
  todo: { icon: CheckSquare, color: 'text-blue-soft', bg: 'bg-blue-soft/10', label: 'To Do' },
  reminder: { icon: Bell, color: 'text-orange-soft', bg: 'bg-orange-soft/10', label: 'Reminder' },
} as const

export function QuickCaptureView() {
  const { items, isLoading, fetchCaptures, addCapture, updateCapture, deleteCapture } = useCaptureStore()
  const [text, setText] = useState('')
  const [type, setType] = useState<'thought' | 'idea' | 'todo' | 'reminder'>('thought')
  const [filter, setFilter] = useState<'all' | 'unprocessed' | 'processed'>('unprocessed')

  useEffect(() => { fetchCaptures().catch(() => toast.error('Failed to load captures')) }, [fetchCaptures])

  const filtered = useMemo(() => {
    const valid = items.filter(i => i && i._id)
    return valid.filter(i =>
      filter === 'all' ? true :
      filter === 'unprocessed' ? !i.processed :
      i.processed
    )
  }, [items, filter])

  const stats = useMemo(() => ({
    total: items.length,
    unprocessed: items.filter(i => !i.processed).length,
    thoughts: items.filter(i => i.type === 'thought').length,
    ideas: items.filter(i => i.type === 'idea').length,
  }), [items])

  const handleAdd = async () => {
    if (!text.trim()) return
    await addCapture({ text, type }).catch(() => toast.error('Failed to add capture'))
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Inbox className="w-6 h-6 text-accent" /> Quick Capture
        </h1>
        <p className="text-text-muted text-xs mt-0.5">Dump your thoughts, process later</p>
      </div>

      {/* Quick Input */}
      <div className="card mb-6 border-accent/20">
        <div className="flex gap-1.5 mb-3">
          {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([key, cfg]) => (
            <button key={key} onClick={() => setType(key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                type === key ? `${cfg.bg} ${cfg.color} font-medium` : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
              }`}><cfg.icon className="w-3 h-3" />{cfg.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Press Enter to capture..."
            className="input flex-1 text-sm" autoFocus />
          <button onClick={handleAdd} disabled={!text.trim()} className="btn px-4">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-xl font-bold text-accent">{stats.total}</p>
          <p className="text-[11px] text-text-secondary">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-orange-soft">{stats.unprocessed}</p>
          <p className="text-[11px] text-text-secondary">Inbox</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-green-soft">{stats.ideas}</p>
          <p className="text-[11px] text-text-secondary">Ideas</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-text-muted">{stats.thoughts}</p>
          <p className="text-[11px] text-text-secondary">Thoughts</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-bg-elevated rounded-lg p-1 mb-5">
        {(['unprocessed', 'all', 'processed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all capitalize ${
              filter === f ? 'bg-bg-surface text-accent font-medium shadow-sm' : 'text-text-muted'
            }`}>{f === 'unprocessed' ? `Inbox (${stats.unprocessed})` : f}</button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-sm text-text-muted">{filter === 'unprocessed' ? 'Inbox clear!' : 'No captures yet'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((item, i) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.thought
            return (
              <motion.div key={item._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className={`card group flex items-start gap-3 ${item.processed ? 'opacity-60' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.processed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.text}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                    <span className={`px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                  <button onClick={() => updateCapture(item._id, { processed: !item.processed }).catch(() => toast.error('Failed to update'))}
                    className={`p-1 rounded ${item.processed ? 'text-text-muted' : 'text-green-soft hover:bg-green-soft/10'}`} title="Toggle processed">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { if (confirm('Delete this capture?')) deleteCapture(item._id).catch(() => toast.error('Failed to delete')) }} className="text-text-muted hover:text-red-soft p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
