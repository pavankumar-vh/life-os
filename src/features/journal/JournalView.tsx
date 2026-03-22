'use client'

import { useEffect, useState } from 'react'
import { useJournalStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Hash, ChevronRight } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

const MOODS = ['😫', '😕', '😐', '🙂', '😊']

function JournalEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Write your thoughts...' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[200px] outline-none font-sans text-sm text-text-primary leading-relaxed',
      },
    },
  })

  return (
    <div className="tiptap-editor border-3 border-border bg-bg-elevated p-4 focus-within:border-brutal-yellow transition-colors">
      <EditorContent editor={editor} />
    </div>
  )
}

export function JournalView() {
  const { entries, isLoading, fetchEntries, saveEntry, deleteEntry } = useJournalStore()
  const [activeEntry, setActiveEntry] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState(3)
  const [editTags, setEditTags] = useState('')
  const [showNew, setShowNew] = useState(false)
  const today = toISODate()

  useEffect(() => { fetchEntries().catch(() => {}) }, [fetchEntries])

  const startNew = () => {
    setActiveEntry(null)
    setEditTitle('')
    setEditContent('')
    setEditMood(3)
    setEditTags('')
    setShowNew(true)
  }

  const openEntry = (entry: typeof entries[0]) => {
    setActiveEntry(entry._id)
    setEditTitle(entry.title)
    setEditContent(entry.content)
    setEditMood(entry.mood)
    setEditTags(entry.tags.join(', '))
    setShowNew(true)
  }

  const handleSave = async () => {
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    const data: Record<string, unknown> = {
      date: today,
      title: editTitle || `Journal — ${formatDate(today)}`,
      content: editContent,
      mood: editMood,
      tags,
    }
    if (activeEntry) data._id = activeEntry
    await saveEntry(data)
    setShowNew(false)
    setActiveEntry(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brutal-yellow" />
            Journal
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">{entries.length} entries</p>
        </div>
        <button onClick={startNew} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Write
        </button>
      </div>

      {/* Editor */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border-3 border-brutal-yellow bg-bg-surface p-4 shadow-brutal">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Entry title..."
                className="brutal-input w-full mb-3 text-lg font-display"
              />

              {/* Mood picker */}
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Mood:</span>
                {MOODS.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => setEditMood(i + 1)}
                    className={`text-xl p-1 transition-all ${
                      editMood === i + 1 ? 'scale-125 bg-brutal-yellow/20 border-2 border-brutal-yellow' : 'opacity-50 hover:opacity-100 border-2 border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <JournalEditor content={editContent} onChange={setEditContent} />

              {/* Tags */}
              <div className="flex items-center gap-2 mt-3">
                <Hash className="w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Tags (comma separated)..."
                  className="brutal-input flex-1 text-xs"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="brutal-btn flex-1">Save Entry</button>
                <button onClick={() => setShowNew(false)} className="brutal-btn-ghost">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading entries...</p>
        </div>
      ) : entries.length === 0 && !showNew ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">Your journal is empty</p>
          <p className="font-mono text-xs text-text-muted mt-1">Start writing your thoughts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <motion.div
              key={entry._id}
              layout
              className="border-3 border-border bg-bg-surface p-4 hover:border-border-strong transition-all cursor-pointer group"
              onClick={() => openEntry(entry)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{MOODS[entry.mood - 1] || '😐'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-mono text-sm font-bold truncate">{entry.title || 'Untitled'}</h3>
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
                    {formatDate(entry.date)}
                  </p>
                </div>
                {entry.tags.length > 0 && (
                  <div className="hidden md:flex gap-1">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="brutal-badge text-[8px] text-brutal-cyan">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteEntry(entry._id) }}
                  className="text-text-muted hover:text-brutal-red transition-colors p-1 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
