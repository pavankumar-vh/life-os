'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/Toast'
import {
  Shield, Upload, FolderPlus, Star, StarOff, Trash2, Download,
  Search, Grid, List, File, FileImage, FileText, FileVideo,
  FileAudio, Archive, X, FolderOpen, ChevronRight, Eye,
  MoreHorizontal, Edit2, FolderSymlink, Tag, Lock,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────

type FileType = 'image' | 'pdf' | 'video' | 'audio' | 'document' | 'archive' | 'other'

interface VaultFile {
  _id: string
  name: string
  originalName: string
  url: string
  key: string
  mimeType: string
  sizeBytes: number
  fileType: FileType
  folder: string
  tags: string[]
  starred: boolean
  createdAt: string
  updatedAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function FileIcon({ type, className = 'w-5 h-5' }: { type: FileType; className?: string }) {
  const icons: Record<FileType, React.ElementType> = {
    image: FileImage,
    pdf: FileText,
    video: FileVideo,
    audio: FileAudio,
    document: FileText,
    archive: Archive,
    other: File,
  }
  const colors: Record<FileType, string> = {
    image: 'text-emerald-400',
    pdf: 'text-red-400',
    video: 'text-purple-400',
    audio: 'text-blue-400',
    document: 'text-sky-400',
    archive: 'text-yellow-400',
    other: 'text-text-muted',
  }
  const Icon = icons[type]
  return <Icon className={`${className} ${colors[type]}`} />
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function VaultView() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  const [files, setFiles] = useState<VaultFile[]>([])
  const [folders, setFolders] = useState<string[]>(['Root'])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFolder, setActiveFolder] = useState('Root')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showStarred, setShowStarred] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderVal, setNewFolderVal] = useState('')
  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null

  const authFetch = useCallback((url: string, opts: RequestInit = {}) => {
    return fetch(url, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    })
  }, [token])

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const [filesRes, foldersRes] = await Promise.all([
        authFetch(`${apiBase}/api/vault`),
        authFetch(`${apiBase}/api/vault/folders`),
      ])
      setFiles(await filesRes.json())
      setFolders(await foldersRes.json())
    } catch {
      toast.error('Failed to load vault')
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, authFetch])

  useEffect(() => { load() }, [load])

  const uploadFile = useCallback(async (file: File) => {
    if (!process.env.NEXT_PUBLIC_API_URL && apiBase === 'http://localhost:4000') {
      // fine, local
    }
    const form = new FormData()
    form.append('file', file)
    form.append('folder', activeFolder)
    form.append('name', file.name)

    setUploading(true)
    setUploadProgress(0)
    try {
      const res = await fetch(`${apiBase}/api/vault/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Upload failed')
        return
      }
      const newFile: VaultFile = await res.json()
      setFiles(prev => [newFile, ...prev])
      if (!folders.includes(activeFolder)) setFolders(prev => [...prev, activeFolder])
      toast.success(`"${file.name}" uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }, [apiBase, token, activeFolder, folders])

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return
    Array.from(fileList).forEach(uploadFile)
  }

  const deleteFile = async (f: VaultFile) => {
    setMenuOpen(null)
    try {
      const res = await authFetch(`${apiBase}/api/vault/${f._id}`, { method: 'DELETE' })
      if (!res.ok) { toast.error('Failed to delete'); return }
      setFiles(prev => prev.filter(x => x._id !== f._id))
      toast.success('File deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const toggleStar = async (f: VaultFile) => {
    setMenuOpen(null)
    try {
      const res = await authFetch(`${apiBase}/api/vault/${f._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ starred: !f.starred }),
      })
      if (!res.ok) return
      const updated = await res.json()
      setFiles(prev => prev.map(x => x._id === updated._id ? updated : x))
    } catch {
      toast.error('Failed to update star')
    }
  }

  const renameFile = async (f: VaultFile) => {
    if (!renameVal.trim()) return
    setRenaming(null)
    try {
      const res = await authFetch(`${apiBase}/api/vault/${f._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: renameVal.trim() }),
      })
      const updated = await res.json()
      setFiles(prev => prev.map(x => x._id === updated._id ? updated : x))
      toast.success('Renamed')
    } catch {
      toast.error('Failed to rename')
    }
  }

  const createFolder = () => {
    const name = newFolderVal.trim()
    if (!name || folders.includes(name)) { setNewFolderOpen(false); return }
    setFolders(prev => [...prev, name])
    setActiveFolder(name)
    setNewFolderOpen(false)
    setNewFolderVal('')
  }

  const filtered = useMemo(() => {
    return files.filter(f => {
      if (showStarred && !f.starred) return false
      if (!showStarred && f.folder !== activeFolder) return false
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [files, activeFolder, search, showStarred])

  const stats = useMemo(() => ({
    total: files.length,
    totalSize: files.reduce((s, f) => s + f.sizeBytes, 0),
    starred: files.filter(f => f.starred).length,
    byType: {
      image: files.filter(f => f.fileType === 'image').length,
      doc: files.filter(f => ['pdf', 'document'].includes(f.fileType)).length,
      video: files.filter(f => f.fileType === 'video').length,
    },
  }), [files])

  // Drag and drop on the whole page
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }
  const onDragLeave = () => setDragOver(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className="flex h-full gap-0 relative"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {dragOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent/50"
            style={{ background: 'rgba(232,213,183,0.06)', backdropFilter: 'blur(4px)' }}
          >
            <Upload className="w-12 h-12 text-accent mb-3" />
            <p className="text-accent text-lg font-medium">Drop files to upload to Vault</p>
            <p className="text-text-muted text-sm mt-1">{activeFolder} folder</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left sidebar — folders */}
      <div
        className="w-52 shrink-0 flex flex-col border-r border-border py-4 overflow-y-auto"
        style={{ background: 'rgba(255,255,255,0.01)' }}
      >
        {/* Header */}
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(232,213,183,0.15),rgba(232,213,183,0.05))', border: '1px solid rgba(232,213,183,0.15)' }}>
              <Shield className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Vault</h2>
              <p className="text-[10px] text-text-muted">{formatBytes(stats.totalSize)}</p>
            </div>
          </div>
        </div>

        {/* Starred */}
        <button
          onClick={() => setShowStarred(s => !s)}
          className={`mx-3 mb-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
            showStarred
              ? 'bg-accent/10 text-accent font-medium'
              : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          Starred
          {stats.starred > 0 && (
            <span className="ml-auto text-[10px] bg-accent/20 text-accent rounded-full px-1.5 py-0.5 leading-none">
              {stats.starred}
            </span>
          )}
        </button>

        <div className="h-px bg-border mx-3 my-2" />

        {/* Folders */}
        <div className="px-3 flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Folders</span>
          <button
            onClick={() => setNewFolderOpen(true)}
            className="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
            title="New folder"
          >
            <FolderPlus className="w-3 h-3" />
          </button>
        </div>

        {newFolderOpen && (
          <div className="mx-3 mb-1 flex items-center gap-1">
            <input
              autoFocus
              value={newFolderVal}
              onChange={e => setNewFolderVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setNewFolderOpen(false) }}
              placeholder="Folder name"
              className="flex-1 text-xs bg-white/[0.05] border border-accent/30 rounded-lg px-2.5 py-1.5 text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
        )}

        <div className="space-y-0.5 px-3">
          {folders.map(folder => (
            <button
              key={folder}
              onClick={() => { setActiveFolder(folder); setShowStarred(false) }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all text-left ${
                !showStarred && activeFolder === folder
                  ? 'bg-accent/[0.08] text-accent font-medium'
                  : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{folder}</span>
              <span className="ml-auto text-[10px] text-text-muted tabular-nums">
                {files.filter(f => f.folder === folder).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Lock className="w-3 h-3" />
            <span>Vault</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-text-primary font-medium">{showStarred ? '⭐ Starred' : activeFolder}</span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-border rounded-lg text-text-primary placeholder:text-text-muted outline-none focus:border-accent/30 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* View toggle */}
            <div className="flex bg-bg-elevated border border-border rounded-lg p-0.5 gap-0.5">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Upload */}
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => handleFiles(e.target.files)} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(232,213,183,0.1)', border: '1px solid rgba(232,213,183,0.2)', color: '#e8d5b7' }}
            >
              {uploading ? (
                <><div className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-3.5 h-3.5" />Upload</>
              )}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-border/50 shrink-0 text-[11px] text-text-muted">
          <span>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
          {search && <span className="text-accent">matching "{search}"</span>}
          <span className="ml-auto flex items-center gap-3">
            {stats.byType.image > 0 && <span><FileImage className="w-3 h-3 inline mr-1 text-emerald-400" />{stats.byType.image} images</span>}
            {stats.byType.doc > 0 && <span><FileText className="w-3 h-3 inline mr-1 text-sky-400" />{stats.byType.doc} docs</span>}
            {stats.byType.video > 0 && <span><FileVideo className="w-3 h-3 inline mr-1 text-purple-400" />{stats.byType.video} videos</span>}
          </span>
        </div>

        {/* File area */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 gap-4"
            >
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(232,213,183,0.06)', border: '1px solid rgba(232,213,183,0.1)' }}>
                <Shield className="w-9 h-9 text-accent/40" />
              </div>
              <div className="text-center">
                <p className="text-sm text-text-muted font-medium">
                  {search ? `No files matching "${search}"` : showStarred ? 'No starred files' : 'Empty folder'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {!search && !showStarred && 'Drop files here or click Upload to add files'}
                </p>
              </div>
              {!search && !showStarred && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors"
                >
                  Upload files
                </button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map(f => (
                <motion.div
                  key={f._id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative rounded-xl border border-border bg-bg-elevated hover:border-accent/30 transition-all cursor-pointer p-3 flex flex-col gap-2"
                >
                  {/* Thumbnail / icon */}
                  <div
                    className="aspect-square w-full rounded-lg overflow-hidden flex items-center justify-center relative"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                    onClick={() => setPreviewFile(f)}
                  >
                    {f.fileType === 'image' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileIcon type={f.fileType} className="w-10 h-10" />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-2">
                      <button onClick={() => setPreviewFile(f)}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                      <a href={f.url} download={f.name} onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Download className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  </div>

                  {/* Name + meta */}
                  {renaming === f._id ? (
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFile(f); if (e.key === 'Escape') setRenaming(null) }}
                      onBlur={() => renameFile(f)}
                      className="text-[11px] text-text-primary bg-white/[0.06] border border-accent/30 rounded px-1.5 py-0.5 outline-none w-full"
                    />
                  ) : (
                    <p className="text-[11px] text-text-primary font-medium truncate leading-tight"
                      title={f.name}>{f.name}</p>
                  )}
                  <p className="text-[10px] text-text-muted">{formatBytes(f.sizeBytes)}</p>

                  {/* Star indicator */}
                  {f.starred && <Star className="absolute top-2 left-2 w-3 h-3 text-accent fill-accent" />}

                  {/* Context menu button */}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === f._id ? null : f._id) }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {menuOpen === f._id && (
                      <ContextMenu file={f} onClose={() => setMenuOpen(null)}
                        onStar={() => toggleStar(f)}
                        onRename={() => { setRenaming(f._id); setRenameVal(f.name); setMenuOpen(null) }}
                        onDelete={() => deleteFile(f)} />
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="space-y-0.5">
              {filtered.map((f, i) => (
                <motion.div
                  key={f._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="group flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors relative"
                >
                  <FileIcon type={f.fileType} className="w-4 h-4 shrink-0" />
                  {renaming === f._id ? (
                    <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') renameFile(f); if (e.key === 'Escape') setRenaming(null) }}
                      onBlur={() => renameFile(f)}
                      className="flex-1 text-sm text-text-primary bg-white/[0.06] border border-accent/30 rounded px-2 py-0.5 outline-none"
                    />
                  ) : (
                    <span className="flex-1 text-sm text-text-primary truncate min-w-0 cursor-pointer"
                      onClick={() => setPreviewFile(f)}>{f.name}</span>
                  )}
                  {f.starred && <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />}
                  <span className="text-xs text-text-muted shrink-0 hidden sm:block">{formatBytes(f.sizeBytes)}</span>
                  <span className="text-xs text-text-muted shrink-0 hidden md:block">{formatDate(f.createdAt)}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => toggleStar(f)} title={f.starred ? 'Unstar' : 'Star'}
                      className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors">
                      {f.starred ? <StarOff className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                    </button>
                    <a href={f.url} download={f.name}
                      className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => { setRenaming(f._id); setRenameVal(f.name) }}
                      className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteFile(f)}
                      className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
        )}
      </AnimatePresence>

      {/* Close menu on background click */}
      {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />}
    </div>
  )
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function ContextMenu({ file, onClose, onStar, onRename, onDelete }: {
  file: VaultFile
  onClose: () => void
  onStar: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: -4 }}
      transition={{ duration: 0.12 }}
      className="absolute right-1 top-10 z-40 w-44 rounded-xl border border-white/[0.08] py-1 shadow-2xl overflow-hidden"
      style={{ background: 'rgba(22,22,24,0.98)', backdropFilter: 'blur(20px)' }}
    >
      <a href={file.url} download={file.name} className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:bg-white/[0.06] transition-colors">
        <Download className="w-3.5 h-3.5" /> Download
      </a>
      <button onClick={onRename} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:bg-white/[0.06] transition-colors">
        <Edit2 className="w-3.5 h-3.5" /> Rename
      </button>
      <button onClick={onStar} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:bg-white/[0.06] transition-colors">
        {file.starred ? <><StarOff className="w-3.5 h-3.5" /> Unstar</> : <><Star className="w-3.5 h-3.5" /> Star</>}
      </button>
      <div className="h-px bg-white/[0.06] mx-2 my-0.5" />
      <button onClick={onDelete} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-400 hover:bg-red-400/10 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </button>
    </motion.div>
  )
}

// ─── Preview Modal ──────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        className="relative max-w-4xl w-full max-h-[90vh] rounded-2xl overflow-hidden border border-white/[0.08] flex flex-col"
        style={{ background: 'rgba(14,14,16,0.98)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileIcon type={file.fileType} className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium text-text-primary truncate">{file.name}</span>
            <span className="text-xs text-text-muted shrink-0">{(file.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={file.url} download={file.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          {file.fileType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg" />
          ) : file.fileType === 'pdf' ? (
            <iframe src={file.url} className="w-full h-full min-h-[60vh] rounded-lg" title={file.name} />
          ) : file.fileType === 'video' ? (
            <video src={file.url} controls className="max-w-full max-h-full rounded-lg" />
          ) : file.fileType === 'audio' ? (
            <div className="flex flex-col items-center gap-6">
              <FileAudio className="w-20 h-20 text-blue-400" />
              <audio src={file.url} controls className="w-full max-w-md" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-10">
              <FileIcon type={file.fileType} className="w-20 h-20" />
              <p className="text-text-muted text-sm">Preview not available</p>
              <a href={file.url} download={file.name}
                className="px-4 py-2 rounded-lg text-sm font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" /> Download to view
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
