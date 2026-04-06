'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useWhiteboardStore, type WhiteboardData, type WhiteboardFolderData } from '@/store'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Pencil, ChevronLeft, MoreHorizontal,
  Download, Copy, FolderPlus, Folder, FolderOpen, ArrowLeft,
  LayoutGrid, List, Search, X, Edit3, Move, ChevronRight,
  Save, Cloud, CloudOff, Undo2,
} from 'lucide-react'
import { toast } from '@/components/Toast'
import dynamic from 'next/dynamic'

import '@excalidraw/excalidraw/index.css'

const ExcalidrawWrapper = dynamic(
  () => import('@excalidraw/excalidraw').then(mod => {
    const Exc = mod.Excalidraw
    return function Wrapper(props: any) { return <Exc {...props} /> }
  }),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center text-text-muted text-sm">Loading editor...</div> }
)

type ViewMode = 'grid' | 'list'
type SaveStatus = 'saved' | 'saving' | 'unsaved'

export function WhiteboardView() {
  const {
    boards, folders, activeBoard, isLoading,
    fetchBoards, fetchFolders, saveBoard, deleteBoard,
    saveFolder, deleteFolder, setActiveBoard,
  } = useWhiteboardStore()

  const [showBoardList, setShowBoardList] = useState(true)
  const [boardTitle, setBoardTitle] = useState('Untitled Board')
  const [menuOpen, setMenuOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')
  const [movingBoard, setMovingBoard] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ id: string; type: 'board' | 'folder'; x: number; y: number } | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [pendingDelete, setPendingDelete] = useState<{ item: WhiteboardData; timer: NodeJS.Timeout } | null>(null)
  const excalidrawRef = useRef<any>(null)
  const hasLoaded = useRef(false)

  useEffect(() => {
    if (!hasLoaded.current) {
      fetchBoards()
      fetchFolders()
      hasLoaded.current = true
    }
  }, [fetchBoards, fetchFolders])

  useEffect(() => {
    const handler = () => setContextMenu(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  const breadcrumbs = useMemo(() => {
    const path: WhiteboardFolderData[] = []
    let id = currentFolderId
    while (id) {
      const folder = folders.find(f => f._id === id)
      if (!folder) break
      path.unshift(folder)
      id = folder.parentId
    }
    return path
  }, [currentFolderId, folders])

  const currentFolders = useMemo(() => {
    let items = folders.filter(f => f.parentId === currentFolderId)
    if (searchQuery) items = items.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    return items.sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, currentFolderId, searchQuery])

  const currentBoards = useMemo(() => {
    let items = boards.filter(b => (b.folderId || null) === currentFolderId)
    if (pendingDelete) items = items.filter(b => b._id !== pendingDelete.item._id)
    if (searchQuery) items = items.filter(b => b.title.toLowerCase().includes(searchQuery.toLowerCase()))
    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [boards, currentFolderId, searchQuery, pendingDelete])

  const totalInFolder = (folderId: string) => {
    return boards.filter(b => b.folderId === folderId).length +
           folders.filter(f => f.parentId === folderId).length
  }

  const createNewBoard = async () => {
    const board = await saveBoard({ title: 'Untitled Board', folderId: currentFolderId, snapshot: {} })
    setBoardTitle('Untitled Board')
    setActiveBoard(board)
    setShowBoardList(false)
    setSaveStatus('saved')
  }

  const openBoard = (board: WhiteboardData) => {
    setBoardTitle(board.title)
    setActiveBoard(board)
    setShowBoardList(false)
    setSaveStatus('saved')
  }

  const goBack = async () => {
    if (activeBoard && excalidrawRef.current) {
      setSaveStatus('saving')
      const elements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()
      const files = excalidrawRef.current.getFiles()
      await saveBoard({
        _id: activeBoard._id,
        title: boardTitle,
        snapshot: { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files },
      })
      setSaveStatus('saved')
    }
    excalidrawRef.current = null
    setShowBoardList(true)
    setActiveBoard(null)
  }

  const duplicateBoard = async () => {
    if (!activeBoard) return
    let snapshot = activeBoard.snapshot
    if (excalidrawRef.current) {
      const elements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()
      const files = excalidrawRef.current.getFiles()
      snapshot = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files }
    }
    await saveBoard({ title: boardTitle + ' (copy)', folderId: activeBoard.folderId, snapshot })
    setMenuOpen(false)
    toast.success('Board duplicated')
  }

  const exportBoard = () => {
    if (!excalidrawRef.current) return
    const elements = excalidrawRef.current.getSceneElements()
    const appState = excalidrawRef.current.getAppState()
    const data = JSON.stringify({ title: boardTitle, elements, appState }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = boardTitle.replace(/\s+/g, '-') + '.excalidraw.json'
    a.click()
    URL.revokeObjectURL(url)
    setMenuOpen(false)
    toast.success('Exported')
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    await saveFolder({ name: newFolderName.trim(), parentId: currentFolderId })
    setNewFolderName('')
    setShowNewFolder(false)
    toast.success('Folder created')
  }

  const handleRenameFolder = async (id: string) => {
    if (!renameFolderName.trim()) return
    await saveFolder({ _id: id, name: renameFolderName.trim() })
    setRenamingFolder(null)
    toast.success('Folder renamed')
  }

  const handleDeleteFolder = async (id: string) => {
    await deleteFolder(id)
    toast.success('Folder deleted')
  }

  const handleDeleteBoard = (board: WhiteboardData) => {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timer)
      deleteBoard(pendingDelete.item._id).catch(() => toast.error('Failed to delete'))
    }
    const timer = setTimeout(() => {
      deleteBoard(board._id).catch(() => toast.error('Failed to delete'))
      setPendingDelete(null)
    }, 3500)
    setPendingDelete({ item: board, timer })
  }

  const handleMoveBoard = async (boardId: string, targetFolderId: string | null) => {
    const board = boards.find(b => b._id === boardId)
    if (!board) return
    await saveBoard({ _id: boardId, title: board.title, folderId: targetFolderId, snapshot: board.snapshot })
    setMovingBoard(null)
    toast.success('Board moved')
  }

  const handleContextMenu = (e: React.MouseEvent, id: string, type: 'board' | 'folder') => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ id, type, x: e.clientX, y: e.clientY })
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleExcalidrawChange = useCallback((elements: readonly any[], appState: any, files: any) => {
    if (!activeBoard) return
    setSaveStatus('unsaved')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await saveBoard({
          _id: activeBoard._id,
          title: boardTitle,
          snapshot: {
            elements: [...elements],
            appState: { viewBackgroundColor: appState.viewBackgroundColor },
            files,
          },
        })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('unsaved')
      }
    }, 2000)
  }, [activeBoard, boardTitle, saveBoard])

  // Cleanup save timer
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  if (isLoading && boards.length === 0) return <ListSkeleton />

  // ════════════════ BOARD LIST / DRIVE VIEW ════════════════
  if (showBoardList || !activeBoard) {
    return (
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-6 animate-in fade-in duration-300">
        {/* ── Header + Search in one bar ───────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2 shrink-0">
              <Pencil size={18} className="text-accent" />
              {currentFolderId ? (
                <>
                  <button onClick={() => setCurrentFolderId(null)}
                    className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                    Whiteboard
                  </button>
                  {breadcrumbs.map(bc => (
                    <span key={bc._id} className="flex items-center gap-1">
                      <ChevronRight size={13} className="text-text-muted" />
                      <button onClick={() => setCurrentFolderId(bc._id)}
                        className="text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                        {bc.name}
                      </button>
                    </span>
                  ))}
                </>
              ) : 'Whiteboard'}
            </h1>
            <span className="text-[10px] text-text-muted shrink-0 hidden sm:block">{boards.length} boards · {folders.length} folders</span>
          </div>
          <div className="flex items-center gap-2">
            {currentFolderId && (
              <button onClick={() => {
                const parent = folders.find(f => f._id === currentFolderId)
                setCurrentFolderId(parent?.parentId ?? null)
              }} className="btn-ghost text-xs">
                <ArrowLeft size={14} /> Up
              </button>
            )}
            <button onClick={() => setShowNewFolder(true)} className="btn-ghost text-xs">
              <FolderPlus size={14} /> New Folder
            </button>
            <button onClick={createNewBoard} className="btn text-xs">
              <Plus size={14} /> New Board
            </button>
          </div>
        </div>

        {/* ── Search + view toggle ─────────────────────────────── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search boards & folders..." className="input text-xs w-full !pl-8 !py-2" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X size={11} />
              </button>
            )}
          </div>
          <div className="flex border border-glass-border rounded-lg overflow-hidden shrink-0">
            <button onClick={() => setViewMode('grid')}
              className={`px-2.5 py-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-glass-strong'}`}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-2.5 py-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-glass-strong'}`}>
              <List size={13} />
            </button>
          </div>
        </div>

        {/* New Folder */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="card border-accent/30 flex items-center gap-3">
                <Folder size={18} className="text-accent shrink-0" />
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} autoFocus
                  placeholder="Folder name..." className="input text-sm flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolder(false) }} />
                <button onClick={handleCreateFolder} className="btn text-xs">Create</button>
                <button onClick={() => setShowNewFolder(false)} className="btn-ghost text-xs"><X size={14} /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Move modal */}
        <AnimatePresence>
          {movingBoard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
              onClick={() => setMovingBoard(null)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="card w-80 p-5 space-y-3" onClick={e => e.stopPropagation()}>
                <h3 className="text-sm font-medium text-text-primary flex items-center gap-2"><Move size={14} /> Move to folder</h3>
                <button onClick={() => handleMoveBoard(movingBoard, null)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-glass-strong transition-colors flex items-center gap-2 cursor-pointer">
                  <Folder size={14} /> Root (My Boards)
                </button>
                {folders.map(f => (
                  <button key={f._id} onClick={() => handleMoveBoard(movingBoard, f._id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-glass-strong transition-colors flex items-center gap-2 cursor-pointer">
                    <Folder size={14} style={{ color: f.color }} /> {f.name}
                  </button>
                ))}
                <button onClick={() => setMovingBoard(null)} className="btn-ghost text-xs w-full">Cancel</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Undo delete bar */}
        <AnimatePresence>
          {pendingDelete && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <span className="text-xs text-red-400">"{pendingDelete.item.title}" will be deleted</span>
                <button onClick={() => { clearTimeout(pendingDelete.timer); setPendingDelete(null) }}
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium cursor-pointer">
                  <Undo2 className="w-3 h-3" /> Undo
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {currentFolders.length === 0 && currentBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(232,213,183,0.07)', border: '1px solid rgba(232,213,183,0.08)' }}>
              <Pencil className="w-7 h-7 text-accent/40" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary mb-1">
                {searchQuery ? 'No results found' : currentFolderId ? 'This folder is empty' : 'No boards yet'}
              </p>
              {!searchQuery && (
                <p className="text-xs text-text-muted mb-4">Create a board to start sketching ideas</p>
              )}
            </div>
            {!searchQuery && (
              <button onClick={createNewBoard} className="btn text-xs">
                <Plus size={14} /> Create your first board
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div>
            {currentFolders.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase text-text-muted tracking-wider mb-2">Folders</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentFolders.map(folder => (
                    <motion.div key={folder._id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="card cursor-pointer hover:border-accent/20 transition-all group"
                      onClick={() => setCurrentFolderId(folder._id)}
                      onContextMenu={e => handleContextMenu(e, folder._id, 'folder')}>
                      <div className="flex items-start justify-between mb-2">
                        <FolderOpen size={28} style={{ color: folder.color }} className="opacity-80" />
                        <button onClick={e => { e.stopPropagation(); handleContextMenu(e, folder._id, 'folder') }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-glass-strong text-text-muted transition-all">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                      {renamingFolder === folder._id ? (
                        <input value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)} autoFocus
                          className="input text-xs w-full" onClick={e => e.stopPropagation()}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder._id); if (e.key === 'Escape') setRenamingFolder(null) }}
                          onBlur={() => handleRenameFolder(folder._id)} />
                      ) : (
                        <p className="text-sm font-medium text-text-primary truncate">{folder.name}</p>
                      )}
                      <p className="text-[10px] text-text-muted mt-1">{totalInFolder(folder._id)} items</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            {currentBoards.length > 0 && (
              <div>
                {currentFolders.length > 0 && <p className="text-[10px] uppercase text-text-muted tracking-wider mb-2">Boards</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {currentBoards.map(board => {
                      const hasContent = board.snapshot && (board.snapshot as any).elements?.length > 0
                      const elementCount = hasContent ? (board.snapshot as any).elements.filter((e: any) => !e.isDeleted).length : 0
                      return (
                      <motion.div key={board._id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="card cursor-pointer hover:border-accent/20 transition-all group"
                        onClick={() => openBoard(board)}
                        onContextMenu={e => handleContextMenu(e, board._id, 'board')}>
                        {/* Preview */}
                        <div className="w-full h-28 relative overflow-hidden flex items-center justify-center rounded-xl mb-0"
                          style={{ background: 'linear-gradient(135deg, rgba(232,213,183,0.05) 0%, rgba(10,10,10,0.7) 100%)' }}>
                          <div className="absolute inset-0 opacity-[0.035]"
                            style={{
                              backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
                              backgroundSize: '20px 20px',
                            }} />
                          {hasContent ? (
                            <div className="relative text-center">
                              <div className="w-9 h-9 mx-auto rounded-xl flex items-center justify-center mb-1"
                                style={{ background: 'rgba(232,213,183,0.1)', border: '1px solid rgba(232,213,183,0.15)' }}>
                                <Pencil size={15} className="text-accent" />
                              </div>
                              <p className="text-[10px] text-text-muted">{elementCount} elements</p>
                            </div>
                          ) : (
                            <div className="relative text-center opacity-40">
                              <Pencil size={18} className="text-text-muted mx-auto mb-1" />
                              <p className="text-[10px] text-text-muted">Empty</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-accent/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-start justify-between mt-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-medium text-text-primary truncate">{board.title}</h3>
                            <p className="text-[10px] text-text-muted mt-0.5">
                              {new Date(board.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {elementCount > 0 && ` · ${elementCount} elements`}
                            </p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); handleContextMenu(e, board._id, 'board') }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-glass-strong text-text-muted transition-all">
                            <MoreHorizontal size={14} />
                          </button>
                        </div>
                      </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card divide-y divide-glass-border">
            {currentFolders.map(folder => (
              <div key={folder._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-glass-strong transition-colors cursor-pointer group"
                onClick={() => setCurrentFolderId(folder._id)}
                onContextMenu={e => handleContextMenu(e, folder._id, 'folder')}>
                <FolderOpen size={18} style={{ color: folder.color }} />
                {renamingFolder === folder._id ? (
                  <input value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)} autoFocus
                    className="input text-xs flex-1" onClick={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder._id); if (e.key === 'Escape') setRenamingFolder(null) }}
                    onBlur={() => handleRenameFolder(folder._id)} />
                ) : (
                  <span className="text-sm font-medium text-text-primary flex-1 truncate">{folder.name}</span>
                )}
                <span className="text-[10px] text-text-muted">{totalInFolder(folder._id)} items</span>
                <button onClick={e => { e.stopPropagation(); handleContextMenu(e, folder._id, 'folder') }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-glass-strong text-text-muted transition-all">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            ))}
            {currentBoards.map(board => (
              <div key={board._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-glass-strong transition-colors cursor-pointer group"
                onClick={() => openBoard(board)}
                onContextMenu={e => handleContextMenu(e, board._id, 'board')}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(232,213,183,0.06)', border: '1px solid rgba(232,213,183,0.08)' }}>
                  <Pencil size={12} className="text-accent/70" />
                </div>
                <span className="text-sm font-medium text-text-primary flex-1 truncate">{board.title}</span>
                <span className="text-[10px] text-text-muted">
                  {new Date(board.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <button onClick={e => { e.stopPropagation(); handleContextMenu(e, board._id, 'board') }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-glass-strong text-text-muted transition-all">
                  <MoreHorizontal size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Context Menu */}
        <AnimatePresence>
          {contextMenu && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 w-44 rounded-xl bg-[rgba(20,20,20,0.95)] border border-glass-border shadow-xl overflow-hidden backdrop-blur-md"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={e => e.stopPropagation()}>
              {contextMenu.type === 'board' ? (
                <>
                  <button onClick={() => { setMovingBoard(contextMenu.id); setContextMenu(null) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Move size={13} /> Move to folder
                  </button>
                  <button onClick={() => {
                    const b = boards.find(x => x._id === contextMenu.id)
                    if (b) { saveBoard({ title: b.title + ' (copy)', folderId: b.folderId, snapshot: b.snapshot }); toast.success('Duplicated') }
                    setContextMenu(null)
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Copy size={13} /> Duplicate
                  </button>
                  <div className="border-t border-glass-border" />
                  <button onClick={() => {
                    const b = boards.find(x => x._id === contextMenu.id)
                    if (b) handleDeleteBoard(b)
                    setContextMenu(null)
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => {
                    const f = folders.find(x => x._id === contextMenu.id)
                    setRenameFolderName(f?.name ?? '')
                    setRenamingFolder(contextMenu.id)
                    setContextMenu(null)
                  }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Edit3 size={13} /> Rename
                  </button>
                  <div className="border-t border-glass-border" />
                  <button onClick={() => { handleDeleteFolder(contextMenu.id); setContextMenu(null) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <Trash2 size={13} /> Delete
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // ════════════════ EXCALIDRAW EDITOR ════════════════
  const initialData = activeBoard.snapshot && Object.keys(activeBoard.snapshot).length > 0
    ? {
        elements: (activeBoard.snapshot as any).elements ?? [],
        appState: {
          ...((activeBoard.snapshot as any).appState ?? {}),
          theme: 'dark' as const,
        },
        files: (activeBoard.snapshot as any).files ?? undefined,
      }
    : { elements: [], appState: { theme: 'dark' as const } }

  return (
    <div className="fixed inset-0 z-40 bg-bg-primary flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-solid border-b border-border z-[300] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-elevated border border-white/[0.07] text-text-secondary hover:text-text-primary text-xs font-medium transition-all cursor-pointer hover:border-white/[0.12]">
            <ChevronLeft className="w-4 h-4" /> Boards
          </button>
          <input value={boardTitle} onChange={e => setBoardTitle(e.target.value)}
            onBlur={() => {
              if (activeBoard) {
                let snapshot = activeBoard.snapshot
                if (excalidrawRef.current) {
                  const elements = excalidrawRef.current.getSceneElements()
                  const appState = excalidrawRef.current.getAppState()
                  const files = excalidrawRef.current.getFiles()
                  snapshot = { elements, appState: { viewBackgroundColor: appState.viewBackgroundColor }, files }
                }
                saveBoard({ _id: activeBoard._id, title: boardTitle, snapshot })
              }
            }}
            className="px-3 py-2 rounded-xl bg-bg-elevated border border-white/[0.07] text-sm text-text-primary outline-none min-w-[200px] focus:border-accent/40 transition-colors font-medium"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg bg-bg-elevated border border-white/[0.05]">
            {saveStatus === 'saved' && <><Cloud className="w-3 h-3 text-green-400" /><span className="text-green-400">Saved</span></>}
            {saveStatus === 'saving' && <><Save className="w-3 h-3 text-accent animate-pulse" /><span className="text-accent">Saving...</span></>}
            {saveStatus === 'unsaved' && <><CloudOff className="w-3 h-3 text-text-muted" /><span className="text-text-muted">Unsaved</span></>}
          </div>
          {/* Menu */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl bg-bg-elevated border border-white/[0.06] text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-full right-0 mt-2 w-44 rounded-xl bg-[rgba(20,20,20,0.95)] border border-white/[0.06] shadow-xl overflow-hidden z-50 backdrop-blur-md">
                  <button onClick={duplicateBoard}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Copy className="w-3.5 h-3.5" /> Duplicate Board
                  </button>
                  <button onClick={exportBoard}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-secondary hover:bg-white/[0.05] transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Export JSON
                  </button>
                  <div className="border-t border-white/[0.06]" />
                  <button onClick={() => { deleteBoard(activeBoard._id); setShowBoardList(true); setActiveBoard(null); setMenuOpen(false); toast.success('Board deleted') }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Board
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Excalidraw Canvas */}
      <div className="flex-1 relative">
        <ExcalidrawWrapper
          key={activeBoard._id}
          excalidrawAPI={(api: any) => { excalidrawRef.current = api }}
          initialData={initialData}
          onChange={handleExcalidrawChange}
          theme="dark"
        />
      </div>
    </div>
  )
}
