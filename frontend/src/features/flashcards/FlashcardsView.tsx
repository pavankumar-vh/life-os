'use client'

import { useEffect, useState, useMemo } from 'react'
import { useFlashcardStore, type FlashcardData } from '@/store'
import { toISODate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, Trash2, RotateCcw, Check, X, Layers, Award } from 'lucide-react'
import { toast } from '@/components/Toast'

export function FlashcardsView() {
  const { cards, isLoading, fetchCards, addCard, updateCard, deleteCard } = useFlashcardStore()
  const [mode, setMode] = useState<'browse' | 'study' | 'add'>('browse')
  const [studyIdx, setStudyIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeDeck, setActiveDeck] = useState('All')
  const [form, setForm] = useState({ deck: '', front: '', back: '', difficulty: 'medium' as FlashcardData['difficulty'] })

  useEffect(() => { fetchCards().catch(() => toast.error('Failed to load flashcards')) }, [fetchCards])

  const decks = useMemo(() => {
    const set = new Set(cards.map(c => c.deck))
    return ['All', ...Array.from(set)]
  }, [cards])

  const filtered = useMemo(() => {
    if (activeDeck === 'All') return cards
    return cards.filter(c => c.deck === activeDeck)
  }, [cards, activeDeck])

  const dueCards = useMemo(() => {
    const today = toISODate()
    return filtered.filter(c => c.nextReview <= today)
  }, [filtered])

  const stats = useMemo(() => ({
    total: cards.length,
    due: dueCards.length,
    mastered: cards.filter(c => c.timesReviewed > 0 && c.timesCorrect / c.timesReviewed >= 0.8).length,
    decks: new Set(cards.map(c => c.deck)).size,
  }), [cards, dueCards])

  const studyCards = dueCards.length > 0 ? dueCards : filtered
  const currentCard = studyCards[studyIdx]

  const handleAnswer = async (correct: boolean) => {
    if (!currentCard) return
    const daysToAdd = correct
      ? currentCard.difficulty === 'easy' ? 7 : currentCard.difficulty === 'medium' ? 3 : 1
      : 0
    const next = new Date()
    next.setDate(next.getDate() + daysToAdd)
    await updateCard(currentCard._id, {
      timesReviewed: currentCard.timesReviewed + 1,
      timesCorrect: currentCard.timesCorrect + (correct ? 1 : 0),
      nextReview: toISODate(next),
    }).catch(() => toast.error('Failed to update card'))
    setShowAnswer(false)
    setStudyIdx(i => (i + 1) % studyCards.length)
  }

  const handleAdd = async () => {
    if (!form.front || !form.back || !form.deck) return
    await addCard({ ...form, nextReview: toISODate(), timesReviewed: 0, timesCorrect: 0 }).catch(() => toast.error('Failed to add card'))
    setForm({ deck: form.deck, front: '', back: '', difficulty: 'medium' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Brain className="w-6 h-6 text-accent" /> Flashcards
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.due} cards due today</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setMode('study'); setStudyIdx(0); setShowAnswer(false) }} className={`btn ${mode === 'study' ? 'bg-accent/15' : ''}`}>Study</button>
          <button onClick={() => setMode('add')} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{stats.total}</p>
          <p className="text-[11px] text-text-secondary">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-soft">{stats.due}</p>
          <p className="text-[11px] text-text-secondary">Due</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-soft">{stats.mastered}</p>
          <p className="text-[11px] text-text-secondary">Mastered</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-soft">{stats.decks}</p>
          <p className="text-[11px] text-text-secondary">Decks</p>
        </div>
      </div>

      {/* Deck Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" />
        {decks.map(d => (
          <button key={d} onClick={() => setActiveDeck(d)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${activeDeck === d ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted'}`}>{d}</button>
        ))}
      </div>

      {/* Study Mode */}
      {mode === 'study' && currentCard && (
        <div className="mb-6">
          <div className="card min-h-[200px] flex flex-col items-center justify-center text-center cursor-pointer" onClick={() => setShowAnswer(!showAnswer)}>
            <span className={`text-[11px] px-2 py-0.5 rounded-full mb-3 ${currentCard.difficulty === 'easy' ? 'bg-green-soft/15 text-green-soft' : currentCard.difficulty === 'hard' ? 'bg-red-soft/15 text-red-soft' : 'bg-accent/15 text-accent'}`}>{currentCard.difficulty} · {currentCard.deck}</span>
            <AnimatePresence mode="wait">
              {!showAnswer ? (
                <motion.div key="front" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} exit={{ rotateY: 90 }} transition={{ duration: 0.2 }}>
                  <p className="text-sm text-text-primary font-medium">{currentCard.front}</p>
                  <p className="text-xs text-text-muted mt-3">Click to reveal answer</p>
                </motion.div>
              ) : (
                <motion.div key="back" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} exit={{ rotateY: 90 }} transition={{ duration: 0.2 }}>
                  <p className="text-sm text-accent">{currentCard.back}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {showAnswer && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center gap-4 mt-4">
              <button onClick={() => handleAnswer(false)} className="flex items-center gap-2 px-6 py-3 bg-red-soft/15 text-red-soft rounded-xl hover:bg-red-soft/25 transition-colors">
                <X className="w-4 h-4" /> Wrong
              </button>
              <button onClick={() => handleAnswer(true)} className="flex items-center gap-2 px-6 py-3 bg-green-soft/15 text-green-soft rounded-xl hover:bg-green-soft/25 transition-colors">
                <Check className="w-4 h-4" /> Correct
              </button>
            </motion.div>
          )}
          <p className="text-center text-xs text-text-muted mt-3">{studyIdx + 1} / {studyCards.length}</p>
        </div>
      )}

      {mode === 'study' && !currentCard && (
        <div className="card text-center py-12 mb-6">
          <Award size={32} className="text-accent mb-2" />
          <p className="text-sm text-text-primary font-medium">All caught up!</p>
          <p className="text-xs text-text-muted mt-1">No cards due right now. Add more or come back later.</p>
        </div>
      )}

      {/* Add Mode */}
      <AnimatePresence>
        {mode === 'add' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Deck name" value={form.deck} onChange={e => setForm(f => ({ ...f, deck: e.target.value }))} />
                <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as FlashcardData['difficulty'] }))}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <textarea className="input w-full min-h-[60px] resize-none" placeholder="Question (front)" value={form.front} onChange={e => setForm(f => ({ ...f, front: e.target.value }))} />
              <textarea className="input w-full min-h-[60px] resize-none" placeholder="Answer (back)" value={form.back} onChange={e => setForm(f => ({ ...f, back: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={handleAdd} className="btn flex-1">Add Card</button>
                <button onClick={() => setMode('browse')} className="btn-ghost px-4">Done</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browse Cards */}
      {mode === 'browse' && (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filtered.map(card => {
              const accuracy = card.timesReviewed > 0 ? Math.round((card.timesCorrect / card.timesReviewed) * 100) : 0
              return (
                <motion.div key={card._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card flex items-center gap-3 group">
                  <div className={`w-1.5 h-8 rounded-full ${card.difficulty === 'easy' ? 'bg-green-soft' : card.difficulty === 'hard' ? 'bg-red-soft' : 'bg-accent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{card.front}</p>
                    <p className="text-[11px] text-text-secondary">{card.deck} · {accuracy}% accuracy · {card.timesReviewed}x reviewed</p>
                  </div>
                  <button onClick={() => { if (confirm('Delete this flashcard?')) deleteCard(card._id).catch(() => toast.error('Failed to delete card')) }} className="btn-ghost p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
