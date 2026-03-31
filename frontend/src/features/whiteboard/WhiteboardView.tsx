'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useWhiteboardStore } from '@/store'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Pencil, ChevronLeft, MoreHorizontal,
  Download, Copy
} from 'lucide-react'
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from 'tldraw'
import 'tldraw/tldraw.css'

export function WhiteboardView() {
  const { boards, activeBoard, isLoading, fetchBoards, saveBoard, deleteBoard, setActiveBoard } = useWhiteboardStore()
  const [showBoardList, setShowBoardList] = useState(true)
  const [boardTitle, setBoardTitle] = useState('Untitled Board')
  const [menuOpen, setMenuOpen] = useState(false)
  const editorRef = useRef<Editor | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (!hasLoaded.current) { fetchBoards(); hasLoaded.current = true }
  }, [fetchBoards])

  const triggerSave = useCallback(() => {
    if (!activeBoard || !editorRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (!editorRef.current || !activeBoard) return
      const { document } = getSnapshot(editorRef.current.store)
      saveBoard({
        _id: activeBoard._id,
        title: boardTitle,
        snapshot: document as unknown as Record<string, unknown>,
      })
    }, 2000)
  }, [activeBoard, boardTitle, saveBoard])

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    editor.user.updateUserPreferences({ colorScheme: 'dark' })

    if (activeBoard?.snapshot && Object.keys(activeBoard.snapshot).length > 0) {
      try {
        loadSnapshot(
          editor.store,
          { document: activeBoard.snapshot } as unknown as Partial<TLEditorSnapshot>
        )
      } catch (e) {
        console.warn('Failed to load snapshot:', e)
      }
    }

    const unsub = editor.store.listen(() => {
      triggerSave()
    }, { scope: 'document', source: 'user' })

    return () => {
      unsub()
      if (activeBoard && editorRef.current) {
        const { document } = getSnapshot(editorRef.current.store)
        saveBoard({
          _id: activeBoard._id,
          title: boardTitle,
          snapshot: document as unknown as Record<string, unknown>,
        })
      }
    }
  }, [activeBoard, boardTitle, saveBoard, triggerSave])

  const createNewBoard = async () => {
    const board = await saveBoard({ title: 'Untitled Board', snapshot: {} })
    setBoardTitle('Untitled Board')
    setActiveBoard(board)
    setShowBoardList(false)
  }

  const openBoard = (board: typeof boards[0]) => {
    setBoardTitle(board.title)
    setActiveBoard(board)
    setShowBoardList(false)
  }

  const goBack = () => {
    if (activeBoard && editorRef.current) {
      const { document } = getSnapshot(editorRef.current.store)
      saveBoard({
        _id: activeBoard._id,
        title: boardTitle,
        snapshot: document as unknown as Record<string, unknown>,
      })
    }
    editorRef.current = null
    setShowBoardList(true)
    setActiveBoard(null)
  }

  const duplicateBoard = async () => {
    if (!activeBoard) return
    let snapshot = activeBoard.snapshot
    if (editorRef.current) {
      const { document } = getSnapshot(editorRef.current.store)
      snapshot = document as unknown as Record<string, unknown>
    }
    await saveBoard({ title: boardTitle + ' (copy)', snapshot })
    setMenuOpen(false)
  }

  const exportBoard = () => {
    if (!editorRef.current) return
    const snap = getSnapshot(editorRef.current.store)
    const data = JSON.stringify({ title: boardTitle, document: snap.document }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = boardTitle.replace(/\s+/g, '-') + '.json'
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
  }

  if (isLoading && boards.length === 0) return <ListSkeleton />

  if (showBoardList || !activeBoard) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Whiteboard</h1>
            <p className="text-xs text-text-muted mt-1">Draw, sketch, diagram {'\u2014'} powered by tldraw</p>
          </div>
          <button onClick={createNewBoard}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors">
            <Plus className="w-4 h-4" /> New Board
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="card text-center py-16">
            <Pencil className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-text-muted mb-4">No boards yet</p>
            <button onClick={createNewBoard}
              className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors">
              Create your first board
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {boards.map(board => (
                <motion.div key={board._id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="card cursor-pointer hover:border-accent/20 transition-all group"
                  onClick={() => openBoard(board)}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-text-primary">{board.title}</h3>
                    <button onClick={e => { e.stopPropagation(); if (confirm('Delete this board?')) deleteBoard(board._id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="ml-auto">{new Date(board.updatedAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full relative tldraw-wrapper" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="absolute top-3 left-3 z-[300] flex items-center gap-2">
        <button onClick={goBack}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(20,20,20,0.9)] border border-white/[0.06] text-text-secondary hover:text-text-primary text-sm transition-colors backdrop-blur-sm">
          <ChevronLeft className="w-4 h-4" /> Boards
        </button>
        <input value={boardTitle} onChange={e => setBoardTitle(e.target.value)}
          onBlur={() => {
            if (activeBoard) {
              const snap = editorRef.current
                ? (getSnapshot(editorRef.current.store).document as unknown as Record<string, unknown>)
                : activeBoard.snapshot
              saveBoard({ _id: activeBoard._id, title: boardTitle, snapshot: snap })
            }
          }}
          className="px-3 py-2 rounded-xl bg-[rgba(20,20,20,0.9)] border border-white/[0.06] text-sm text-text-primary outline-none min-w-[140px] backdrop-blur-sm"
        />
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-[rgba(20,20,20,0.9)] border border-white/[0.06] text-text-secondary hover:text-text-primary transition-colors backdrop-blur-sm">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-44 rounded-xl bg-[rgba(20,20,20,0.95)] border border-white/[0.06] shadow-xl overflow-hidden z-50 backdrop-blur-md">
                <button onClick={duplicateBoard}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate Board
                </button>
                <button onClick={exportBoard}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
                <div className="border-t border-white/[0.06]" />
                <button onClick={() => { if (confirm('Delete this board?')) { deleteBoard(activeBoard._id); setShowBoardList(true); setActiveBoard(null); setMenuOpen(false) } }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Board
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Tldraw
        key={activeBoard._id}
        onMount={handleMount}
        inferDarkMode
      />
    </div>
  )
}
