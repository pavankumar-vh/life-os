'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useFlashcardStore, type FlashcardData } from '@/store'
import { toISODate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Plus, Trash2, RotateCcw, Check, X, Layers, Award, Sparkles, Upload, Loader2, Undo2, FolderOpen, Folder, ChevronLeft, BarChart3 } from 'lucide-react'
import { toast } from '@/components/Toast'

export function FlashcardsView() {
  const { cards, isLoading, fetchCards, addCard, updateCard, deleteCard, generateCards } = useFlashcardStore()
  const [mode, setMode] = useState<'browse' | 'study' | 'add' | 'generate'>('browse')
  const [studyIdx, setStudyIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [activeDeck, setActiveDeck] = useState('All')
  const [pendingDelete, setPendingDelete] = useState<{ card: FlashcardData; timer: NodeJS.Timeout } | null>(null)
  const [genForm, setGenForm] = useState({ deck: '', topic: '', content: '', count: 10 })
  const [genFiles, setGenFiles] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [form, setForm] = useState({ deck: '', front: '', back: '', difficulty: 'medium' as FlashcardData['difficulty'] })

  useEffect(() => { fetchCards().catch(() => toast.error('Failed to load flashcards')) }, [fetchCards])

  const decks = useMemo(() => {
    const deckMap = new Map<string, { total: number; due: number; mastered: number }>()
    const today = toISODate()
    cards.forEach(c => {
      const d = deckMap.get(c.deck) || { total: 0, due: 0, mastered: 0 }
      d.total++
      if (c.nextReview <= today) d.due++
      if (c.timesReviewed > 0 && c.timesCorrect / c.timesReviewed >= 0.8) d.mastered++
      deckMap.set(c.deck, d)
    })
    return deckMap
  }, [cards])

  const deckNames = useMemo(() => Array.from(decks.keys()).sort(), [decks])

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
    decks: decks.size,
  }), [cards, dueCards, decks])

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

  // Keyboard shortcuts for study mode
  useEffect(() => {
    if (mode !== 'study') return
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setShowAnswer(s => !s) }
      if (showAnswer && (e.key === 'ArrowLeft' || e.key === '1')) handleAnswer(false)
      if (showAnswer && (e.key === 'ArrowRight' || e.key === '2')) handleAnswer(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, showAnswer, currentCard])

  const handleAdd = async () => {
    if (!form.front || !form.back || !form.deck) return
    await addCard({ ...form, nextReview: toISODate(), timesReviewed: 0, timesCorrect: 0 }).catch(() => toast.error('Failed to add card'))
    setForm({ deck: form.deck, front: '', back: '', difficulty: 'medium' })
  }

  const handleGenerate = async () => {
    if (!genForm.deck || (!genForm.topic && !genForm.content && genFiles.length === 0)) return
    setIsGenerating(true)
    try {
      const result = await generateCards({
        deck: genForm.deck,
        topic: genForm.topic || undefined,
        content: genForm.content || undefined,
        count: genForm.count,
        files: genFiles.length > 0 ? genFiles : undefined,
      })
      toast.success(`Generated ${result.length} flashcards!`)
      setGenForm({ deck: genForm.deck, topic: '', content: '', count: 10 })
      setGenFiles([])
      setMode('browse')
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate flashcards')
    } finally {
      setIsGenerating(false)
    }
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
          <button onClick={() => { setGenForm(f => ({ ...f, deck: activeDeck !== 'All' ? activeDeck : f.deck })); setMode('generate') }} className={`btn flex items-center gap-1.5 ${mode === 'generate' ? 'bg-accent/15' : ''}`}><Sparkles className="w-3.5 h-3.5" /> AI</button>
          <button onClick={() => { setForm(f => ({ ...f, deck: activeDeck !== 'All' ? activeDeck : f.deck })); setMode('add') }} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /></button>
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

      {/* Deck Navigation */}
      {activeDeck !== 'All' && (
        <button onClick={() => setActiveDeck('All')} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 mb-4 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> All Decks
        </button>
      )}
      {activeDeck !== 'All' && (
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-medium text-text-primary">{activeDeck}</h2>
          <span className="text-[11px] text-text-muted">{decks.get(activeDeck)?.total || 0} cards · {decks.get(activeDeck)?.due || 0} due</span>
        </div>
      )}

      {/* Study Mode */}
      {mode === 'study' && currentCard && (() => {
        const accuracy = currentCard.timesReviewed > 0 ? Math.round((currentCard.timesCorrect / currentCard.timesReviewed) * 100) : 0
        const progress = studyCards.length > 0 ? Math.round((studyIdx / studyCards.length) * 100) : 0
        return (
        <div className="mb-6 space-y-4">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>Card {studyIdx + 1} of {studyCards.length}</span>
              <span>{progress}% complete</span>
            </div>
            <div className="h-1 rounded-full bg-border overflow-hidden">
              <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>

          {/* Card */}
          <motion.div
            className="card min-h-[240px] flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden"
            onClick={() => setShowAnswer(!showAnswer)}
            whileTap={{ scale: 0.985 }}
          >
            {/* Difficulty + deck badge */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${currentCard.difficulty === 'easy' ? 'bg-green-soft/15 text-green-soft' : currentCard.difficulty === 'hard' ? 'bg-red-soft/15 text-red-soft' : 'bg-accent/15 text-accent'}`}>{currentCard.difficulty}</span>
              <span className="text-[10px] text-text-muted flex items-center gap-1"><Folder className="w-3 h-3" />{currentCard.deck}</span>
            </div>

            {/* Card accuracy mini-stat */}
            {currentCard.timesReviewed > 0 && (
              <div className="absolute bottom-3 right-3 text-[10px] text-text-muted">
                {accuracy}% · {currentCard.timesReviewed}x
              </div>
            )}

            <div className="px-6 py-4 max-w-md">
              <AnimatePresence mode="wait">
                {!showAnswer ? (
                  <motion.div key="front" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    <p className="text-base text-text-primary font-medium leading-relaxed">{currentCard.front}</p>
                    <p className="text-[11px] text-text-muted mt-4 flex items-center justify-center gap-1"><RotateCcw className="w-3 h-3" /> Tap to reveal</p>
                  </motion.div>
                ) : (
                  <motion.div key="back" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    <p className="text-[11px] text-text-muted mb-2 uppercase tracking-wider">Answer</p>
                    <p className="text-base text-accent font-medium leading-relaxed">{currentCard.back}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Answer buttons */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="flex justify-center gap-3">
                <button onClick={() => handleAnswer(false)} className="flex-1 max-w-[160px] flex items-center justify-center gap-2 px-5 py-3.5 bg-red-soft/10 text-red-soft rounded-xl hover:bg-red-soft/20 active:scale-95 transition-all font-medium text-sm">
                  <X className="w-4 h-4" /> Wrong
                </button>
                <button onClick={() => handleAnswer(true)} className="flex-1 max-w-[160px] flex items-center justify-center gap-2 px-5 py-3.5 bg-green-soft/10 text-green-soft rounded-xl hover:bg-green-soft/20 active:scale-95 transition-all font-medium text-sm">
                  <Check className="w-4 h-4" /> Correct
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keyboard hint */}
          <p className="text-center text-[10px] text-text-muted hidden md:block">Press <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">Space</kbd> to flip · <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">←</kbd> Wrong · <kbd className="px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-[10px]">→</kbd> Correct</p>
        </div>
        )
      })()}

      {mode === 'study' && !currentCard && (
        <div className="card text-center py-16 mb-6">
          <Award size={40} className="text-accent mx-auto mb-3" />
          <p className="text-base text-text-primary font-semibold">All caught up!</p>
          <p className="text-xs text-text-muted mt-1.5">No cards due right now. Add more or come back later.</p>
          <button onClick={() => setMode('browse')} className="btn mt-4 text-xs">Browse Decks</button>
        </div>
      )}

      {/* Add Mode */}
      <AnimatePresence>
        {mode === 'add' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {deckNames.length > 0 && !form.deck ? (
                  <select className="input" value="" onChange={e => setForm(f => ({ ...f, deck: e.target.value === '__new__' ? '' : e.target.value }))}>
                    <option value="" disabled>Select deck...</option>
                    {deckNames.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="__new__">+ New Deck</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input className="input flex-1" placeholder="New deck name" value={form.deck} onChange={e => setForm(f => ({ ...f, deck: e.target.value }))} />
                    {deckNames.length > 0 && <button type="button" onClick={() => setForm(f => ({ ...f, deck: '' }))} className="btn-ghost px-2 text-[10px] text-text-muted shrink-0">Back</button>}
                  </div>
                )}
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

      {/* AI Generate Mode */}
      <AnimatePresence>
        {mode === 'generate' && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="card space-y-3 border-accent/10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium text-text-primary">AI Flashcard Generator</p>
              </div>
              <p className="text-xs text-text-muted">Enter a topic, paste content, or upload a document — AI will generate flashcards.</p>
              <div className="grid grid-cols-2 gap-3">
                {deckNames.length > 0 && !genForm.deck ? (
                  <select className="input" value="" onChange={e => setGenForm(f => ({ ...f, deck: e.target.value === '__new__' ? '' : e.target.value }))}>
                    <option value="" disabled>Select deck... *</option>
                    {deckNames.map(n => <option key={n} value={n}>{n}</option>)}
                    <option value="__new__">+ New Deck</option>
                  </select>
                ) : (
                  <div className="flex gap-1.5">
                    <input className="input flex-1" placeholder="New deck name *" value={genForm.deck} onChange={e => setGenForm(f => ({ ...f, deck: e.target.value }))} />
                    {deckNames.length > 0 && <button type="button" onClick={() => setGenForm(f => ({ ...f, deck: '' }))} className="btn-ghost px-2 text-[10px] text-text-muted shrink-0">Back</button>}
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-text-muted mb-1 block">Cards to generate</label>
                  <input type="number" className="input w-full" min={1} max={30} value={genForm.count} onChange={e => setGenForm(f => ({ ...f, count: Number(e.target.value) || 10 }))} />
                </div>
              </div>
              <input className="input w-full" placeholder="Topic (e.g. 'React hooks', 'WW2 events')" value={genForm.topic} onChange={e => setGenForm(f => ({ ...f, topic: e.target.value }))} />

              {/* File Upload */}
              <div className="space-y-2">
                {genFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {genFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
                        <Upload className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="text-xs text-text-primary truncate flex-1">{f.name}</span>
                        <span className="text-[11px] text-text-muted shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setGenFiles(prev => prev.filter((_, j) => j !== i))} className="p-0.5 rounded hover:bg-bg-elevated transition-colors"><X className="w-3 h-3 text-text-muted" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border hover:border-accent/30 hover:bg-accent/5 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-text-muted" />
                  <span className="text-xs text-text-muted">{genFiles.length > 0 ? 'Add more files' : 'Upload PDF, DOCX, TXT, MD, or CSV'}</span>
                  <input type="file" className="hidden" multiple accept=".pdf,.docx,.txt,.md,.csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/csv" onChange={e => { const newFiles = Array.from(e.target.files || []); if (newFiles.length) setGenFiles(prev => [...prev, ...newFiles]); e.target.value = '' }} />
                </label>
              </div>

              <textarea className="input w-full min-h-[80px] resize-none" placeholder="Or paste content / notes here..." value={genForm.content} onChange={e => setGenForm(f => ({ ...f, content: e.target.value }))} />
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={isGenerating || (!genForm.topic && !genForm.content && genFiles.length === 0) || !genForm.deck} className="btn flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isGenerating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5" /> Generate Flashcards</>}
                </button>
                <button onClick={() => setMode('browse')} className="btn-ghost px-4">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">Card will be removed</span>
              <button onClick={() => { clearTimeout(pendingDelete.timer); setPendingDelete(null) }} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium"><Undo2 className="w-3 h-3" /> Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browse — Deck Folders */}
      {mode === 'browse' && activeDeck === 'All' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {deckNames.map(name => {
            const d = decks.get(name)!
            const pct = d.total > 0 ? Math.round((d.mastered / d.total) * 100) : 0
            return (
              <motion.button key={name} onClick={() => setActiveDeck(name)} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-left hover:border-accent/30 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <Folder className="w-5 h-5 text-accent" />
                  <span className="text-[10px] text-text-muted">{d.total} cards</span>
                </div>
                <p className="text-xs font-medium text-text-primary truncate mb-1">{name}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  <span className="text-red-soft">{d.due} due</span>
                  <span>·</span>
                  <span className="text-green-soft">{d.mastered} mastered</span>
                </div>
                <div className="mt-2.5 h-1 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              </motion.button>
            )
          })}
          {deckNames.length === 0 && (
            <div className="col-span-full card text-center py-10">
              <Layers className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">No decks yet. Add a card or generate with AI to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Browse — Cards in a Deck */}
      {mode === 'browse' && activeDeck !== 'All' && (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.filter(c => c._id !== pendingDelete?.card._id).map(card => {
              const accuracy = card.timesReviewed > 0 ? Math.round((card.timesCorrect / card.timesReviewed) * 100) : 0
              return (
                <motion.div key={card._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card flex items-center gap-3 group">
                  <div className={`w-1.5 h-8 rounded-full ${card.difficulty === 'easy' ? 'bg-green-soft' : card.difficulty === 'hard' ? 'bg-red-soft' : 'bg-accent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{card.front}</p>
                    <p className="text-[11px] text-text-secondary">{accuracy}% accuracy · {card.timesReviewed}x reviewed</p>
                  </div>
                  <button onClick={() => {
                    if (pendingDelete) { clearTimeout(pendingDelete.timer); deleteCard(pendingDelete.card._id).catch(() => toast.error('Failed to delete')) }
                    const timer = setTimeout(() => { deleteCard(card._id).catch(() => toast.error('Failed to delete')); setPendingDelete(null) }, 3500)
                    setPendingDelete({ card, timer })
                  }} className="btn-ghost p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="card text-center py-10">
              <Layers className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-xs text-text-muted">No cards in this deck yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
